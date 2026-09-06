import type {
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
} from "sequelize";
import {
  AutoIncrement,
  Column,
  DataType,
  Default,
  Model,
  PrimaryKey,
  Table,
} from "sequelize-typescript";

/**
 * 用户交易记录（历史遗留表）
 * 消费时 money 存负数，充值时 money 存正数
 */
@Table({
  tableName: "balance_change_log",
  underscored: false,
  timestamps: false,
})
export class BalanceChangeLog extends Model<
  InferAttributes<BalanceChangeLog>,
  InferCreationAttributes<BalanceChangeLog>
> {
  /**
   * 消费记录id
   */
  @AutoIncrement
  @PrimaryKey
  @Column(DataType.BIGINT)
  declare id: CreationOptional<number>;

  /**
   * 消费时间（UNIX时间戳）
   */
  @Default(0)
  @Column(DataType.INTEGER)
  declare when: number;

  /**
   * 消费类型
   * 1-送礼
   */
  @Column(DataType.TINYINT)
  declare why: number;

  /**
   * 礼物ID
   */
  @Default(0)
  @Column(DataType.INTEGER)
  declare giftid: CreationOptional<number>;

  /**
   * 礼物价格
   */
  @Column(DataType.INTEGER)
  declare giftprice: CreationOptional<number>;

  /**
   * 礼物数量
   */
  @Column(DataType.INTEGER)
  declare giftnum: CreationOptional<number>;

  /**
   * 送礼用户id
   */
  @Column(DataType.INTEGER)
  declare userid: CreationOptional<number>;

  /**
   * 收礼主播id
   */
  @Column(DataType.INTEGER)
  declare touserid: CreationOptional<number>;

  /**
   * 变动钻石数
   * 消费时存负数，充值时存正数
   */
  @Column(DataType.DECIMAL(11, 3))
  declare money: string;

  /**
   * 本次消费后用户剩余钻石
   */
  @Column(DataType.INTEGER)
  declare balance: CreationOptional<number>;

  /**
   * 直播场次id
   */
  @Column(DataType.INTEGER)
  declare showid: CreationOptional<number>;

  /**
   * 该笔消费是否已结算 (0|1)
   * 未结算的数据不在本系统展示
   */
  @Column(DataType.TINYINT)
  declare is_settle_accounts: CreationOptional<number>;

  /**
   * 收礼主播公会id
   */
  @Column(DataType.INTEGER)
  declare to_guild_id: CreationOptional<number>;

  /**
   * 送礼用户包分组id
   */
  @Column(DataType.INTEGER)
  declare user_package_group_id: CreationOptional<number>;

  /**
   * 收礼主播包分组id
   */
  @Column(DataType.INTEGER)
  declare touser_package_group_id: CreationOptional<number>;

  @Column(DataType.INTEGER)
  declare point: CreationOptional<number>;

  @Column(DataType.INTEGER)
  declare channel: CreationOptional<number>;

  @Column(DataType.INTEGER)
  declare agentid: CreationOptional<number>;

  @Column(DataType.INTEGER)
  declare user_type: CreationOptional<number>;

  @Column(DataType.INTEGER)
  declare user_parentid: CreationOptional<number>;
}
