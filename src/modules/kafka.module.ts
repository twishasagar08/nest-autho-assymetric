import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KafkaProducerService } from '../services/kafka.producer.service';
import { KafkaConsumerService } from '../services/kafka.consumer.service';

/**
 * Module that provides Kafka functionality to the application
 * Exports both producer and consumer services
 */
@Module({
  imports: [
    ConfigModule.forRoot(), // Load environment variables
  ],
  providers: [
    KafkaProducerService,
    KafkaConsumerService,
  ],
  exports: [
    KafkaProducerService,
    KafkaConsumerService,
  ],
})
export class KafkaModule {}
