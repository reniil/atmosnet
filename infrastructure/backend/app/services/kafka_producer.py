import json
import asyncio
from aiokafka import AIOKafkaProducer
from typing import Dict, Any

from app.config import settings


class KafkaProducer:
    _instance = None
    _producer = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(KafkaProducer, cls).__new__(cls)
        return cls._instance
    
    async def _get_producer(self):
        if self._producer is None:
            self._producer = AIOKafkaProducer(
                bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
                value_serializer=lambda v: json.dumps(v).encode('utf-8'),
                key_serializer=lambda k: k.encode('utf-8') if k else None
            )
            await self._producer.start()
        return self._producer
    
    async def send_observation(self, observation_data: Dict[str, Any]):
        """Send observation to Kafka topic."""
        producer = await self._get_producer()
        await producer.send(
            settings.KAFKA_OBSERVATIONS_TOPIC,
            key=observation_data.get("device_id_hash"),
            value=observation_data
        )
    
    async def close(self):
        """Close the producer connection."""
        if self._producer:
            await self._producer.stop()
            self._producer = None
