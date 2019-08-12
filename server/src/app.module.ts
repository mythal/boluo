import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Connection } from 'typeorm';
import { GraphQLModule } from '@nestjs/graphql';
import { Message } from './messages/messages.entity';
import { MessageService } from './messages/messages.service';
import { MessageResolver } from './messages/messages.resolver';
import { UserService } from './users/users.service';
import { ChannelService } from './channels/channels.service';
import { User } from './users/users.entity';
import { Channel } from './channels/channels.entity';
import { UserResolver } from './users/users.resolver';
import { ChannelResolver } from './channels/channels.resolver';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'db',
      port: 5432,
      username: 'postgres',
      password: 'POSTGRES_PASSWORD',
      database: 'boluo',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
    }),
    GraphQLModule.forRoot({
      autoSchemaFile: '../schema.graphql',
    }),
    TypeOrmModule.forFeature([Message, User, Channel]),
  ],
  controllers: [AppController],
  providers: [AppService, MessageService, UserService, ChannelService, MessageResolver, UserResolver, ChannelResolver],
})
export class AppModule {
  constructor(private readonly connection: Connection) {}
}
