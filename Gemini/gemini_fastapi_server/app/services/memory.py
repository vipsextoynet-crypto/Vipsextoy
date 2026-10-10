import hashlib
from datetime import datetime
from pathlib import Path
from typing import Any

import lmdb
import orjson
from loguru import logger

from app.utils import g_config


class MemoryStore:
    """
    Persistent project memory stored in a separate LMDB environment.

    This uses a different directory from the conversation LMDB so it does
    not conflict with LMDBConversationStore.
    """

    DB_NAME = "memory"

    def __init__(self):
        # Conversation database:
        # data/lmdb
        #
        # Memory database:
        # data/memory
        #
        # Keeping them separate prevents LMDB environment conflicts.
        db_path = Path(g_config.storage.path).parent / "memory"
        max_db_size = g_config.storage.max_size

        db_path.mkdir(parents=True, exist_ok=True)

        self.env = lmdb.open(
            str(db_path),
            map_size=max_db_size,
            max_dbs=3,
            writemap=True,
            readahead=False,
            meminit=False,
        )

        self.db = self.env.open_db(
            self.DB_NAME.encode("utf-8")
        )

        logger.info(
            f"MemoryStore initialized at {db_path} / {self.DB_NAME}"
        )

    @staticmethod
    def _make_key(memory_id: str) -> bytes:
        return f"memory:{memory_id}".encode("utf-8")

    @staticmethod
    def _make_id(project: str, content: str) -> str:
        raw = f"{project}:{content}".encode("utf-8")
        return hashlib.sha256(raw).hexdigest()

    def save(
        self,
        content: str,
        project: str = "default",
        memory_type: str = "note",
        importance: int = 5,
        tags: list[str] | None = None,
    ) -> dict[str, Any]:

        content = content.strip()

        if not content:
            raise ValueError("Memory content cannot be empty")

        importance = max(1, min(10, int(importance)))

        tags = tags or []

        memory_id = self._make_id(
            project,
            content,
        )

        record = {
            "id": memory_id,
            "project": project,
            "type": memory_type,
            "content": content,
            "importance": importance,
            "tags": tags,
            "created_at": datetime.now().isoformat(),
        }

        key = self._make_key(memory_id)

        with self.env.begin(
            write=True,
            db=self.db,
        ) as txn:

            txn.put(
                key,
                orjson.dumps(record),
            )

        logger.info(
            f"Memory saved: "
            f"project={project}, "
            f"type={memory_type}, "
            f"id={memory_id[:12]}"
        )

        return record

    def get(
        self,
        memory_id: str,
    ) -> dict[str, Any] | None:

        key = self._make_key(memory_id)

        with self.env.begin(
            write=False,
            db=self.db,
        ) as txn:

            data = txn.get(key)

        if not data:
            return None

        try:
            return orjson.loads(data)

        except orjson.JSONDecodeError:
            logger.warning(
                f"Invalid memory record: {memory_id}"
            )
            return None

    def search(
        self,
        query: str,
        project: str | None = None,
        limit: int = 10,
    ) -> list[dict[str, Any]]:

        query = query.strip().lower()

        if not query:
            return []

        limit = max(
            1,
            min(50, int(limit)),
        )

        query_words = {
            word
            for word in query.split()
            if len(word) >= 2
        }

        results: list[
            tuple[int, dict[str, Any]]
        ] = []

        with self.env.begin(
            write=False,
            db=self.db,
        ) as txn:

            cursor = txn.cursor()

            for _, value in cursor:

                try:
                    record = orjson.loads(value)

                except orjson.JSONDecodeError:
                    continue

                if (
                    project
                    and record.get("project") != project
                ):
                    continue

                content = str(
                    record.get("content", "")
                ).lower()

                tags = " ".join(
                    record.get("tags", [])
                ).lower()

                memory_type = str(
                    record.get("type", "")
                ).lower()

                searchable = (
                    f"{content} "
                    f"{tags} "
                    f"{memory_type}"
                )

                score = 0

                # Exact phrase match.
                if query in searchable:
                    score += 20

                # Individual word matches.
                for word in query_words:
                    if word in searchable:
                        score += 3

                # Important memories rank higher.
                score += int(
                    record.get(
                        "importance",
                        5,
                    )
                )

                if score > 0:
                    results.append(
                        (
                            score,
                            record,
                        )
                    )

        results.sort(
            key=lambda item: (
                item[0],
                item[1].get(
                    "importance",
                    5,
                ),
            ),
            reverse=True,
        )

        return [
            record
            for _, record in results[:limit]
        ]

    def delete(
        self,
        memory_id: str,
    ) -> bool:

        key = self._make_key(memory_id)

        with self.env.begin(
            write=True,
            db=self.db,
        ) as txn:

            return bool(
                txn.delete(key)
            )

    def count(self) -> int:

        with self.env.begin(
            write=False,
            db=self.db,
        ) as txn:

            return txn.stat()["entries"]

    def close(self):

        if self.env:

            self.env.close()

            self.env = None

            logger.info(
                "MemoryStore closed"
            )