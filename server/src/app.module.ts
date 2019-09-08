import { Module } from '@nestjs/common';
import { AuthController } from './auth/auth.controller';
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
  DEBUG,
  JWT_EXPIRES_IN,
  JWT_SECRET,
  POSTGRES_DATABASE,
  POSTGRES_HOST,
  POSTGRES_PASSWORD,
  POSTGRES_PORT,
  POSTGRES_USERNAME,
} from './settings';
import { PassportModule } from '@nestjs/passport';
import { MemberResolver } from './members/members.resolver';
import { Member } from './members/members.entity';
import { Invitation } from './invitaions/invitaions.entity';
import { MemberService } from './members/members.service';
import { RedisService } from './redis/redis.service';
import { DateScalar } from './scalars';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, 'web'),
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
      debug: DEBUG,
    }),
    TypeOrmModule.forFeature([Message, User, Channel, Member, Invitation]),
    JwtModule.register({
      secret: JWT_SECRET,
      signOptions: { expiresIn: JWT_EXPIRES_IN },
    }),
  ],
  controllers: [AuthController],
  providers: [
    DateScalar,
    RedisService,
    MessageService,
    UserService,
    ChannelService,
    MessageResolver,
    UserResolver,
    ChannelResolver,
    MemberResolver,
    MemberService,
    AuthService,
    LocalStrategy,
    JwtStrategy,
  ],
})
export class AppModule {
  constructor(private readonly connection: Connection) {}
}
