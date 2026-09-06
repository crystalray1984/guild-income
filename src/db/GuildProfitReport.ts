import type {
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
} from "sequelize";
import {
  AllowNull,
  AutoIncrement,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
} from "sequelize-typescript";

@Table({
  tableName: "v2_guild_profit_report",
  underscored: false,
  createdAt: false,
})
export class GuildProfitReport extends Model<
  InferAttributes<GuildProfitReport>,
  InferCreationAttributes<GuildProfitReport>
> {
  @AutoIncrement
  @PrimaryKey
  @Column(DataType.INTEGER)
  declare id: CreationOptional<number>;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare guild_id: number;

  @AllowNull(false)
  @Column(DataType.DECIMAL)
  declare profit: CreationOptional<string>;

  @AllowNull(false)
  @Column(DataType.DECIMAL)
  declare gift_profit: CreationOptional<string>;

  @AllowNull(false)
  @Column(DataType.DECIMAL)
  declare gift_price: CreationOptional<string>;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare year_time: number;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare month_time: number;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare day_time: number;

  @UpdatedAt
  @Column(DataType.DATE)
  declare update_time: CreationOptional<Date>;
}
