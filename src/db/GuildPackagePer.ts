import { type InferAttributes } from "sequelize";
import {
  AllowNull,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
  Unique,
} from "sequelize-typescript";

@Table({
  tableName: "guild_package_per",
  timestamps: false,
  underscored: false,
})
export class GuildPackagePer extends Model<InferAttributes<GuildPackagePer>> {
  @PrimaryKey
  @Column(DataType.INTEGER)
  declare id: number;

  @Unique
  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare guild_id: number;

  @AllowNull(false)
  @Column(DataType.DECIMAL)
  declare guild_per: string;
}
