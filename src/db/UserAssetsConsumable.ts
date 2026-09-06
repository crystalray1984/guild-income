import type { InferAttributes } from "sequelize";
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
  tableName: "user_assets_consumable",
  underscored: false,
  timestamps: false,
})
export class UserAssetsConsumable extends Model<
  InferAttributes<UserAssetsConsumable>
> {
  @PrimaryKey
  @Column(DataType.INTEGER)
  declare id: number;

  @Unique
  @AllowNull(false)
  @Column(DataType.STRING)
  declare uuid: string;

  @AllowNull(false)
  @Column(DataType.DECIMAL)
  declare last_amount: string;

  @AllowNull(false)
  @Column(DataType.DECIMAL)
  declare current_amount: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare update_time: number;
}
