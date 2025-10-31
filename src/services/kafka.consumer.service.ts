import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Kafka, Consumer, logLevel, EachMessagePayload } from 'kafkajs';

/**
 * Types for message handlers and their configuration
 */
interface TopicConfig {
  topic: string;
  fromBeginning?: boolean;
  handler: (message: any) => Promise<void>;
}

/**
 * Service responsible for consuming messages from Kafka topics
 * Handles connection management and message processing
 */
@Injectable()
export class KafkaConsumerService implements OnModuleInit, OnModuleDestroy {
  private kafka: Kafka;
  private consumer: Consumer;
  private readonly logger = new Logger(KafkaConsumerService.name);
  private topicHandlers: Map<string, (message: any) => Promise<void>> = new Map();

  constructor() {
    this.initializeKafka();
    this.registerTopicHandlers();
  }

  /**
   * Initialize Kafka connection with configuration
   */
  private initializeKafka() {
    const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092')
      .split(',')
      .map(b => b.trim());

    this.kafka = new Kafka({
      clientId: process.env.KAFKA_CLIENT_ID || 'nest-auth-consumer',
      brokers,
      logLevel: logLevel.INFO,
    });

    this.consumer = this.kafka.consumer({
      groupId: 'auth-consumer-group',
      // Enable retries for consumer
      retry: {
        initialRetryTime: 100,
        retries: 8
      }
    });
  }

  /**
   * Register handlers for different topics
   */
  private registerTopicHandlers() {
    const topicConfigs: TopicConfig[] = [
      {
        topic: 'login',
        fromBeginning: true,
        handler: async (message) => {
          try {
            this.logger.log(`Processing login event for user: ${message.user?.email}`);
            // Add your login message handling logic here
            // Example: Update user's last login time, trigger notifications, etc.
          } catch (error) {
            this.logger.error(`Error processing login message: ${error.message}`);
            throw error; // Retry will be handled by Kafka
          }
        }
      },
      // Add more topic configurations as needed
    ];

    // Store handlers in map for easy access
    topicConfigs.forEach(config => {
      this.topicHandlers.set(config.topic, config.handler);
    });
  }

  /**
   * Connect to Kafka and subscribe to topics when module initializes
   */
  async onModuleInit() {
    try {
      await this.consumer.connect();
      this.logger.log('Successfully connected to Kafka');

      // Subscribe to all registered topics
      const subscribePromises = Array.from(this.topicHandlers.keys()).map(topic =>
        this.consumer.subscribe({ topic, fromBeginning: true })
      );
      await Promise.all(subscribePromises);

      await this.startConsumer();
    } catch (error) {
      this.logger.error('Failed to initialize Kafka consumer:', error);
      throw error;
    }
  }

  /**
   * Start consuming messages from subscribed topics
   */
  private async startConsumer() {
    await this.consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        const { topic, message, partition } = payload;
        const handler = this.topicHandlers.get(topic);

        try {
          if (!message.value) {
            this.logger.warn(`Received null message from topic ${topic}`);
            return;
          }

          const parsedMessage = JSON.parse(message.value.toString());
          
          this.logger.debug(
            `Processing message from topic ${topic}, partition ${partition}:`,
            parsedMessage
          );

          if (handler) {
            await handler(parsedMessage);
          } else {
            this.logger.warn(`No handler registered for topic ${topic}`);
          }
        } catch (error) {
          this.logger.error(
            `Error processing message from topic ${topic}:`,
            error
          );
          throw error; // Let Kafka handle retry
        }
      }
    });
  }

  /**
   * Gracefully disconnect from Kafka when module destroys
   */
  async onModuleDestroy() {
    try {
      await this.consumer.disconnect();
      this.logger.log('Successfully disconnected from Kafka');
    } catch (error) {
      this.logger.error('Error disconnecting from Kafka:', error);
    }
  }
}