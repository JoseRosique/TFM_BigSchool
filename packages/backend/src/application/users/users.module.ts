import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../../domain/entities/user.entity";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";

/**
 * Users Module
 * Responsabilidad: Gestionar usuarios, perfiles, configuración
 */
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
