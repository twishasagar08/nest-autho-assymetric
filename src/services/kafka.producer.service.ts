import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Kafka, Producer, logLevel } from 'kafkajs';

/**
 * Service responsible for producing messages to Kafka topics
 * Handles connection management and message publishing
 */
@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private kafka: Kafka;
  private producer: Producer;
  private readonly logger = new Logger(KafkaProducerService.name);

  constructor() {
    this.initializeKafka();
  }

  /**
   * Initialize Kafka connection with configuration
   */
  private initializeKafka() {
    const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092')
      .split(',')
      .map(b => b.trim());

    this.kafka = new Kafka({
      clientId: process.env.KAFKA_CLIENT_ID || 'nest-auth-producer',
      brokers,
      logLevel: logLevel.INFO,
    });

    this.producer = this.kafka.producer();
  }

  /**
   * Connect to Kafka when module initializes
   */
  async onModuleInit() {
    try {
      await this.producer.connect();
      this.logger.log('Successfully connected to Kafka');
    } catch (error) {
      this.logger.error('Failed to connect to Kafka:', error);
      throw error;
    }
  }

  /**
   * Disconnect from Kafka when module destroys
   */
  async onModuleDestroy() {
    try {
      await this.producer.disconnect();
      this.logger.log('Successfully disconnected from Kafka');
    } catch (error) {
      this.logger.error('Error disconnecting from Kafka:', error);
    }
  }

  /**
   * Publish a message to a specified Kafka topic
   * @param topic - The Kafka topic to publish to
   * @param message - The message to publish
   * @param key - Optional message key for partition assignment
   */
  async publish<T>(topic: string, message: T, key?: string): Promise<void> {
    try {
      const messageValue = JSON.stringify(message);
      
      await this.producer.send({
        topic,
        messages: [{
          key: key || undefined,
          value: messageValue,
          timestamp: Date.now().toString(),
        }],
      });

      this.logger.debug(`Message published to topic ${topic}:`, message);
    } catch (error) {
      this.logger.error(`Error publishing to topic ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Publish messages in batch to a specified Kafka topic
   * @param topic - The Kafka topic to publish to
   * @param messages - Array of messages to publish
   */
  async publishBatch<T>(topic: string, messages: T[]): Promise<void> {
    try {
      const kafkaMessages = messages.map(message => ({
        value: JSON.stringify(message),
        timestamp: Date.now().toString(),
      }));

      await this.producer.send({
        topic,
        messages: kafkaMessages,
      });

      this.logger.debug(`Batch of ${messages.length} messages published to ${topic}`);
    } catch (error) {
      this.logger.error(`Error publishing batch to topic ${topic}:`, error);
      throw error;
    }
  }
}