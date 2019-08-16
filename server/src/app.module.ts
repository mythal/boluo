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
import { AuthService } from './auth/auth.service';
import { LocalStrategy } from './auth/local.strategy';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './auth/jwt.strategy';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import {
  JWT_SECRET,
  POSTGRES_DATABASE,
  POSTGRES_HOST,
  POSTGRES_PASSWORD,
  POSTGRES_PORT,
  POSTGRES_USERNAME,
} from './settings';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'web', 'dist'),
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: POSTGRES_HOST,
      port: POSTGRES_PORT,
      username: POSTGRES_USERNAME,
      password: POSTGRES_PASSWORD,
      database: POSTGRES_DATABASE,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
    }),
    GraphQLModule.forRoot({
      autoSchemaFile: '../schema.graphql',
      context: ({ req }) => ({ req }),
      installSubscriptionHandlers: true,
    }),
    TypeOrmModule.forFeature([Message, User, Channel]),
    JwtModule.register({
      secret: JWT_SECRET,
      signOptions: { expiresIn: '60s' },
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    MessageService,
    UserService,
    ChannelService,
    MessageResolver,
    UserResolver,
    ChannelResolver,
    AuthService,
    LocalStrategy,
    JwtStrategy,
  ],
})
export class AppModule {
  constructor(private readonly connection: Connection) {}
}
