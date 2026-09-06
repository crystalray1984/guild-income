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
  tableName: "v2_anchor_day_report",
  underscored: false,
  createdAt: false,
})
export class AnchorDayReport extends Model<
  InferAttributes<AnchorDayReport>,
  InferCreationAttributes<AnchorDayReport>
> {
  @AutoIncrement
  @PrimaryKey
  @Column(DataType.INTEGER)
  declare id: CreationOptional<number>;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare type: number;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare anchor_id: number;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare guild_id: number;

  @AllowNull(false)
  @Column(DataType.DECIMAL)
  declare guild_profit: CreationOptional<string>;

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
