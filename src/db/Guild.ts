import { type InferAttributes } from "sequelize";
import {
  AllowNull,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from "sequelize-typescript";

/**
 * 公会表
 */
@Table({ tableName: "guild", underscored: false, timestamps: false })
export class Guild extends Model<InferAttributes<Guild>> {
  @PrimaryKey
  @Column(DataType.INTEGER)
  declare id: number;

  @AllowNull(false)
  @Column(DataType.DECIMAL)
  declare balance: string;

  @Column(DataType.STRING)
  declare uuid: string;

  @Column({ field: "parentid", type: DataType.INTEGER })
  declare parent_id: number;
}
