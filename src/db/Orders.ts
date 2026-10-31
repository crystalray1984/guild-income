import type {
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
} from "sequelize";
import {
  AutoIncrement,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from "sequelize-typescript";

/**
 * 用户充值订单表
 */
@Table({ tableName: "orders", underscored: false, timestamps: false })
export class Orders extends Model<
  InferAttributes<Orders>,
  InferCreationAttributes<Orders>
> {
  /**
   * 充值记录id
   */
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  declare id: CreationOptional<number>;

  /**
   * 历史遗留字段，固定=2
   */
  @Column(DataType.TINYINT)
  declare types: number;

  /**
   * 下单日期，格式YYYYMMDD
   */
  @Column(DataType.INTEGER)
  declare adddate: number;

  /**
   * 订单金额，单位为充值公会的基准货币
   */
  @Column(DataType.DECIMAL(11, 2))
  declare money: string;

  /**
   * 用户ID
   */
  @Column(DataType.INTEGER)
  declare userid: number;

  /**
   * 状态(0:失败,1:成功)
   * 公会代用户充值不会失败，永远为1
   */
  @Column(DataType.TINYINT)
  declare status: number;

  /**
   * 充值渠道
   * 公会代用户充值固定为-1
   */
  @Column(DataType.INTEGER)
  declare paychannel: number;

  @Column(DataType.STRING)
  declare paytype: string;

  /**
   * 用户增加的钻石数
   */
  @Column(DataType.INTEGER)
  declare balanceadd: number;

  /**
   * 充值公会id
   */
  @Column(DataType.INTEGER)
  declare agentid: number;

  /**
   * 最后更新时间（UNIX时间戳）
   */
  @Column(DataType.INTEGER)
  declare lastupdate: number;

  /**
   * 充值记录创建时间
   */
  @Column(DataType.DATE)
  declare current: Date;

  /**
   * 固定填1
   */
  @Column(DataType.TINYINT)
  declare is_dispose: number;

  /**
   * 支付完成时间（UNIX时间戳）
   */
  @Column(DataType.INTEGER)
  declare payment_time: number;

  /**
   * 下单时间
   */
  @Column(DataType.DATE)
  declare create_time: Date;
}
