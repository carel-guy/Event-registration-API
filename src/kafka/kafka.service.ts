import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Consumer, Producer, Partitioners, Admin } from 'kafkajs'; // Import Admin

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;
  private admin: Admin; // Declare Admin client
  private kafkaConfigPromise: Promise<void>;

  constructor(
    private configService: ConfigService,
  ) {
    this.kafkaConfigPromise = this.initializeKafka();
  }

  private async initializeKafka(): Promise<void> {
    const kafkaHost = this.configService.get<string>('KAFKA_HOST') || 'localhost';
    const kafkaPort = this.configService.get<string>('KAFKA_PORT') || '9092';
    const broker = `${kafkaHost}:${kafkaPort}`;

    const clientId = this.configService.get<string>('KAFKA_CLIENT_ID') || 'eventRegistration-service';
    const groupId = this.configService.get<string>('KAFKA_GROUP_ID') || 'eventRegistration-group';

    try {
      this.kafka = new Kafka({
        clientId: clientId,
        brokers: [broker],
      });

      this.producer = this.kafka.producer({ createPartitioner: Partitioners.LegacyPartitioner });
      this.consumer = this.kafka.consumer({ groupId: groupId });
      this.admin = this.kafka.admin(); // Initialize Admin client

      this.logger.log(`Kafka initialized with broker: ${broker}, Client ID: ${clientId}, Group ID: ${groupId}`);
    } catch (error) {
      this.logger.error(`Failed to initialize Kafka: ${error.message}`, error.stack);
      throw new Error(`Failed to initialize Kafka: ${error.message}`);
    }
  }

  async onModuleInit() {
    await this.kafkaConfigPromise;

    // Connect Admin client first to manage topics
    await this.connectWithRetry(this.admin.connect.bind(this.admin), 'admin client');
    await this.createTopicIfNotExists('registration.created');
    await this.createTopicIfNotExists('badge.generate'); // Ensure badge generation topic exists
    await this.connectWithRetry(this.producer.connect.bind(this.producer), 'producer');
    await this.connectWithRetry(this.consumer.connect.bind(this.consumer), 'consumer');
    this.logger.log('KafkaService initialized and connected');
  }

  async onModuleDestroy() {
    this.logger.log('Disconnecting Kafka consumer, producer, and admin client...');
    try {
      if (this.consumer) {
        await this.consumer.disconnect();
      }
      if (this.producer) {
        await this.producer.disconnect();
      }
      if (this.admin) { // Disconnect Admin client
        await this.admin.disconnect();
      }
      this.logger.log('Kafka consumer, producer, and admin client disconnected successfully');
    } catch (error) {
      this.logger.error(`Error during Kafka disconnection: ${error.message}`, error.stack);
    }
  }

  private async connectWithRetry(connectFn: () => Promise<void>, type: string) {
    const maxRetries = 5;
    let retries = 0;
    while (retries < maxRetries) {
      try {
        await connectFn();
        this.logger.log(`Kafka ${type} connected`);
        return;
      } catch (error) {
        retries++;
        const delay = 1000 * Math.pow(2, retries - 1);
        this.logger.warn(`Failed to connect Kafka ${type} (attempt ${retries}/${maxRetries}): ${error.message}. Retrying in ${delay / 1000} seconds...`);
        if (retries >= maxRetries) {
          this.logger.error(`Failed to connect Kafka ${type} after ${maxRetries} attempts. Giving up.`, error.stack);
          throw new Error(`Failed to connect Kafka ${type} after ${maxRetries} attempts: ${error.message}`);
        }
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  private async createTopicIfNotExists(topicName: string): Promise<void> {
    try {
      const topics = await this.admin.listTopics();
      if (topics.includes(topicName)) {
        this.logger.log(`Topic '${topicName}' already exists. Skipping creation.`);
        return;
      }

      this.logger.log(`Topic '${topicName}' does not exist. Attempting to create it.`);
      await this.admin.createTopics({
        validateOnly: false,
        waitForLeaders: true,
        timeout: 5000,
        topics: [{
          topic: topicName,
          numPartitions: 1,
          replicationFactor: 1,
        }],
      });

      this.logger.log(`Topic '${topicName}' creation request sent. Verifying topic readiness...`);

      // Retry mechanism to verify topic is ready
      const maxRetries = 5;
      for (let i = 0; i < maxRetries; i++) {
        try {
          await this.admin.fetchTopicMetadata({ topics: [topicName] });
          this.logger.log(`Topic '${topicName}' is ready.`);
          return; // Success
        } catch (e) {
          if (i === maxRetries - 1) {
            throw e; // Rethrow last error
          }
          const delay = 1000 * (i + 1);
          this.logger.warn(`Verification attempt ${i + 1} failed for topic '${topicName}'. Retrying in ${delay}ms...`);
          await new Promise(res => setTimeout(res, delay));
        }
      }

    } catch (error) {
      this.logger.error(`Failed to create or verify Kafka topic '${topicName}': ${error.message}`, error.stack);
      throw new Error(`Failed to create or verify Kafka topic '${topicName}': ${error.message}`);
    }
  }

  async produce(topic: string, message: any) {
    try {
      if (!this.producer) {
        throw new Error('Kafka producer is not initialized or connected.');
      }
      await this.producer.send({
        topic,
        messages: [{ value: JSON.stringify(message) }],
      });
      this.logger.log(`Message sent to topic ${topic}`);
    } catch (error) {
      this.logger.error(`Failed to send message to topic ${topic}: ${error.message}`, error.stack);
      // Re-throw the error so the calling service can handle it if needed
      throw new Error(`Failed to send message to Kafka: ${error.message}`);
    }
  }

  async startConsumer(topics: string[], handler: (topic: string, message: any) => Promise<void>) {
    if (!this.consumer) {
      throw new Error('Kafka consumer is not initialized or connected.');
    }

    try {
      await this.consumer.subscribe({ topics, fromBeginning: false });
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            if (message.value !== null && message.value !== undefined) {
              const data = JSON.parse(message.value.toString());
              this.logger.debug(`Received message from topic ${topic}, partition ${partition}: ${JSON.stringify(data).substring(0, 200)}...`);
              await handler(topic, data);
              this.logger.log(`Processed message from topic ${topic}, partition ${partition}`);
            } else {
              this.logger.warn(`Received null or undefined message value for topic ${topic}, partition ${partition}. Skipping processing.`);
            }
          } catch (error) {
            this.logger.error(`Error processing message for topic ${topic}, partition ${partition}: ${error.message}`, error.stack);
            if (message.value !== null && message.value !== undefined) {
              await this.sendToDLQ(topic, message.value.toString(), error.message, error.stack);
            } else {
              this.logger.error(`Cannot send to DLQ: Message value was null/undefined for topic ${topic}, partition ${partition} during processing error.`);
            }
          }
        },
      });
      this.logger.log(`Kafka consumer started for topics: ${topics.join(', ')}`);
    } catch (error) {
      this.logger.error(`Failed to start consumer for topics ${topics.join(', ')}: ${error.message}`, error.stack);
      throw new Error(`Failed to start Kafka consumer: ${error.message}`);
    }
  }

  private async sendToDLQ(topic: string, message: string, error: string, errorStack?: string) {
    const dlqTopic = `${topic}.dlq`;
    try {
      if (!this.producer) {
        this.logger.error(`Cannot send to DLQ: Kafka producer is not initialized or connected.`);
        return;
      }
      await this.producer.send({
        topic: dlqTopic,
        messages: [
          {
            value: JSON.stringify({
              originalTopic: topic,
              message,
              error,
              errorStack,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      });
      this.logger.warn(`Sent failed message to DLQ topic ${dlqTopic}. Error: ${error}`);
    } catch (dlqError) {
      this.logger.error(`Failed to send message to DLQ topic ${dlqTopic}: ${dlqError.message}`, dlqError.stack);
    }
  }

  private handlers: { [topic: string]: (message: any) => Promise<void> } = {};

  async subscribe(topic: string, handler: (message: any) => Promise<void>) {
    await this.createTopicIfNotExists(topic);
    this.handlers[topic] = handler;
    this.logger.log(`Handler for topic ${topic} registered.`);
  }

  async run() {
    const topics = Object.keys(this.handlers);
    if (topics.length === 0) {
      this.logger.warn('No consumer handlers registered. Consumer will not be started.');
      return;
    }

    await this.startConsumer(topics, async (topic: string, message: any) => {
      const handler = this.handlers[topic];
      if (handler) {
        await handler(message);
      } else {
        this.logger.warn(`No handler found for topic ${topic}.`);
      }
    });
  }
}
