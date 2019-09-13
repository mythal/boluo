import { Module } from '@nestjs/common';
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
import { ChannelEventResolver } from './events/events.resolver';
import { EventService } from './events/events.service';
import { MediaService } from './media/media.service';
import { MediaResolver } from './media/media.resolver';
import { Media } from './media/media.entity';
import { MediaController } from './media/media.controller';
import { AuthResolver } from './auth/auth.resolver';

const imports = [
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
  TypeOrmModule.forFeature([Message, User, Channel, Member, Invitation, Media]),
  JwtModule.register({
    secret: JWT_SECRET,
    signOptions: { expiresIn: JWT_EXPIRES_IN },
  }),
];

if (DEBUG) {
  const rootPath = join(__dirname, '../../web/dist');
  imports.unshift(ServeStaticModule.forRoot({ rootPath }));
}

@Module({
  imports,
  controllers: [MediaController],
  providers: [
    DateScalar,
    RedisService,
    UserService,
    MediaService,
    MessageService,
    MediaResolver,
    ChannelResolver,
    ChannelService,
    MessageResolver,
    UserResolver,
    MemberResolver,
    MemberService,
    ChannelEventResolver,
    EventService,
    AuthService,
    AuthResolver,
    JwtStrategy,
  ],
})
export class AppModule {
  constructor(private readonly connection: Connection) {}
}
