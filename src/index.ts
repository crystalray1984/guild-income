import dayjs, { Dayjs } from "dayjs";
import Decimal from "decimal.js";
import { random, sample } from "lodash";
import { randomUUID } from "node:crypto";
import {
  Attributes,
  CreationAttributes,
  literal,
  Model,
  ModelStatic,
  Op,
  QueryTypes,
  WhereOptions,
} from "sequelize";
import { Literal } from "sequelize/lib/utils";
import { config } from "./config";
import {
  AnchorDayReport,
  BalanceChangeLog,
  db,
  Guild,
  GuildProfitReport,
  UserAssetsConsumable,
} from "./db";

process.env.TZ = "Asia/Shanghai";

/**
 * 计算指定日期可用的收益
 * @param date
 */
async function getUsableProfit(date: Dayjs): Promise<Decimal> {
  const monthStart = date.clone().startOf("month");

  //查询内购充值数量
  const iapRechargeRows = await db.query<{
    money: Decimal.Value;
    diamonds: Decimal.Value;
  }>(
    {
      query: `
      SELECT
        SUM(money) * 10 AS money,
        SUM(balanceadd) AS diamonds
      FROM
        orders
      WHERE
        paytype IN (?)
        AND status = 1
        AND payment_time >= ?
        AND payment_time < ?
        AND NOT (userid IN (?))
      `,
      values: [
        ["iospay", "googlepay_bmiss"],
        monthStart.unix(),
        date.clone().add(1, "days").unix(),
        config.user_id,
      ],
    },
    {
      type: QueryTypes.SELECT,
    },
  );

  //查询三方充值数量
  const thirdRechargeRows = await db.query<{
    channel_id: number;
    money: Decimal.Value;
    diamonds: Decimal.Value;
    fee_ratio: Decimal.Value;
    origin_fee_ratio: Decimal.Value;
  }>(
    {
      query: `
      SELECT
        orders.paychannel AS channel_id,
        SUM(orders.money) * 10 AS money,
        SUM(orders.balanceadd) AS diamonds,
        web3_pay_targets.fee_ratio,
        web3_pay_targets.origin_fee_ratio
      FROM
        orders
      JOIN
        web3_pay_targets ON web3_pay_targets.id = orders.paychannel
      JOIN
        v2_user_config ON v2_user_config.user_id = orders.userid
      WHERE
        orders.status = 1
        AND v2_user_config.package_group_id = ?
        AND orders.payment_time >= ?
        AND orders.payment_time < ?
      GROUP BY
        orders.paychannel
      `,
      values: [
        config.package_group_id,
        monthStart.unix(),
        date.clone().add(1, "days").unix(),
      ],
    },
    {
      type: QueryTypes.SELECT,
    },
  );

  //可以完全使用的充值数量
  const fakeUser = await db.query<{
    diamonds: Decimal.Value;
  }>(
    {
      query: `
      SELECT
        SUM(balanceadd) AS diamonds
      FROM
        orders
      WHERE
        status = 1
        AND userid IN (?)
      `,
      values: [config.user_id],
    },
    {
      type: QueryTypes.SELECT,
    },
  );

  //内购充值拿5%
  let sum = Decimal(iapRechargeRows[0].money).mul("0.05");

  //三方充值拿手续费差
  thirdRechargeRows.forEach((third) => {
    const delta = Decimal(third.fee_ratio).sub(third.origin_fee_ratio);
    if (delta.greaterThan(0)) {
      sum = sum.add(Decimal(third.diamonds).mul(delta).div(100));
    }
  });

  //所有的收益不能超过总消费的6%
  const allConsume = await BalanceChangeLog.sum("money", {
    where: {
      why: {
        [Op.gt]: 0,
      },
      when: {
        [Op.gte]: monthStart.unix(),
        [Op.lt]: date.add(1, "day").unix(),
      },
      user_package_group_id: config.package_group_id,
      touser_package_group_id: config.package_group_id,
      to_guild_id: {
        [Op.ne]: config.guild_id,
      },
    },
  });

  const value = Decimal.min(Decimal(allConsume).mul("-0.06"), sum).add(
    fakeUser[0].diamonds,
  );

  //减掉已分配的收益
  const allProfit = await AnchorDayReport.sum("gift_price", {
    where: {
      guild_id: config.guild_id,
      anchor_id: config.anchor_id,
      day_time: {
        [Op.between]: [
          parseInt(monthStart.format("YYYYMMDD")),
          parseInt(date.format("YYYYMMDD")),
        ],
      },
    },
  });

  return value.sub(Decimal(allProfit ?? 0).mul(10));
}

/**
 * 模拟一条充值
 */
async function createFakeOrder() {
  const user_id = sample(config.user_id);
  if (!user_id) return;
  if (!config.iap_code) return;

  //先查询内购项对应的数据
  const iap = await db.query<{
    money: Decimal.Value;
    balance: number;
  }>(
    {
      query: `
    SELECT
      *
    FROM
      iap_config
    WHERE
      code = ?
    LIMIT 1
    `,
      values: [config.iap_code],
    },
    {
      type: QueryTypes.SELECT,
    },
  );

  const { money, balance } = iap[0];

  //再查询用于复制的内购订单
  const order = await db.query<{
    id: number;
    sid: string;
    pay_ip: string;
  }>(
    {
      query: `
    SELECT
      id,
      sid,
      pay_ip
    FROM
      orders
    WHERE
      paytype = 'iospay'
      AND status = 1
      AND sid != ''
      AND is_ios_sandbox = 1
    ORDER BY id
    LIMIT 1
    `,
      values: [],
    },
    { type: QueryTypes.SELECT },
  );

  const now = dayjs();
  const order_number = (() => {
    let number = now.format("YYYYMMDDHHmmss");
    number += now.millisecond().toString();
    while (number.length < 32) {
      number += random(0, 9, false).toString();
    }
    return number;
  })();

  const paymentTime = now.clone().add(random(5, 10, false), "second");

  //插入订单
  await db.query(
    {
      query:
        "INSERT INTO `orders` (`adddate`, `money`, `userid`, `status`, `paychannel`, `balanceadd`, `asset_type`, `sid`, `lastupdate`, `paytype`, `current`, `is_dispose`, `merch_order_no`, `order_number`, `device`, `payment_time`, `recharge_type`, `pay_ip`, `extend_str`, `is_first_buy`, `actual_amount`,  `create_time`, `ios_uuid`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,  ?, ?)",
      values: [
        Number(now.format("YYYYMMDD")), //adddate
        money, //money
        user_id, //userid
        1, //status
        0, //paychannel
        balance, //balanceadd
        1, //asset_type
        order[0].sid, //sid
        paymentTime.unix(), //lastupdate
        "iospay", //paytype
        paymentTime.format("YYYY-MM-DD HH:mm:ss"), //current
        1, //is_dispose
        "ios", //merch_order_no
        order_number, //order_number
        "iOS", //device
        paymentTime.unix(), //payment_time
        0, //recharge_type
        order[0].pay_ip, //pay_ip
        JSON.stringify({
          merch_order_no: "ios",
          device: "iOS",
          source: "com.beishijie.bmiss",
          ip: order[0].pay_ip,
          type_name: "ios",
          order_identify: config.iap_code,
        }), //extend_str
        0, //is_first_buy
        money, //actual_amount
        now.format("YYYY-MM-DD HH:mm:ss"), //create_time
        randomUUID(), //ios_uuid
      ],
    },
    { type: QueryTypes.INSERT },
  );

  //删除原订单sid
  await db.query({
    query: "UPDATE orders SET sid = ? WHERE id = ?",
    values: ["", order[0].id],
  });
}

async function addByDate(date: Dayjs) {
  let ratio: Decimal;
  const week = date.day();
  const weekRatio = config.profit_ratio[week.toString()];
  if (typeof weekRatio === "string" || typeof weekRatio === "number") {
    ratio = Decimal(weekRatio);
  } else {
    ratio = Decimal(config.profit_ratio.default);
  }

  if (ratio.lte(0)) {
    console.log(
      `date=${date.format("YYYY-MM-DD")} week=${date.day()} ratio=${ratio.toString()} skiped`,
    );
    return;
  }

  //查询可用收益
  const usable = await getUsableProfit(date);
  if (usable.lt(100)) {
    console.log(
      `date=${date.format("YYYY-MM-DD")} week=${date.day()} ratio=${ratio.toString()} usable=${usable.toDecimalPlaces(2)} 可用收益不足`,
    );
    return;
  }

  const min = ratio.mul(1500);
  const max = ratio.mul(3300);

  let giftPrice = max.sub(min).mul(Math.random()).add(min).floor();
  giftPrice = Decimal.min(giftPrice, usable.floor());

  const giftPriceMoney = giftPrice.div(10);
  const diamonds = giftPrice.mul(config.guild_per).toDecimalPlaces(3);
  const diamondsMoney = diamonds.div(10);

  await Guild.increment(
    {
      balance: diamonds.toNumber(),
    },
    {
      where: {
        id: config.guild_id,
      },
    },
  );

  const year_time = date.year();
  const month_time = parseInt(date.format("YYYYMM"));
  const day_time = parseInt(date.format("YYYYMMDD"));

  await updateOrCreate(
    AnchorDayReport,
    {
      type: 1,
      anchor_id: config.anchor_id,
      guild_id: config.guild_id,
      guild_profit: diamondsMoney.toString(),
      gift_price: giftPriceMoney.toString(),
      year_time,
      month_time,
      day_time,
    },
    {
      guild_profit: literal(
        `${db.getQueryInterface().quoteIdentifier("guild_profit")} + '${diamondsMoney.toNumber()}'`,
      ),
      gift_price: literal(
        `${db.getQueryInterface().quoteIdentifier("gift_price")} + '${giftPriceMoney.toNumber()}'`,
      ),
      update_time: new Date(),
    },
    {
      anchor_id: config.anchor_id,
      guild_id: config.guild_id,
      type: 1,
      day_time,
    },
  );

  await updateOrCreate(
    GuildProfitReport,
    {
      guild_id: config.guild_id,
      profit: diamondsMoney.toString(),
      gift_profit: diamondsMoney.toString(),
      gift_price: giftPriceMoney.toString(),
      year_time,
      month_time,
      day_time,
    },
    {
      profit: literal(
        `${db.getQueryInterface().quoteIdentifier("profit")} + '${diamondsMoney.toNumber()}'`,
      ),
      gift_profit: literal(
        `${db.getQueryInterface().quoteIdentifier("gift_profit")} + '${diamondsMoney.toNumber()}'`,
      ),
      gift_price: literal(
        `${db.getQueryInterface().quoteIdentifier("gift_price")} + '${giftPriceMoney.toNumber()}'`,
      ),
      update_time: new Date(),
    },
    {
      guild_id: config.guild_id,
      day_time,
    },
  );

  await UserAssetsConsumable.update(
    {
      last_amount: literal(
        db.getQueryInterface().quoteIdentifier("current_amount"),
      ),
      current_amount: literal(
        `${db.getQueryInterface().quoteIdentifier("current_amount")} + '${diamondsMoney.toNumber()}'`,
      ),
      update_time: dayjs().unix(),
    },
    { where: { uuid: config.uuid } },
  );

  console.log(
    `date=${date.format("YYYY-MM-DD")} week=${date.day()} ratio=${ratio.toString()} usable=${usable.toDecimalPlaces(2)} price=${giftPrice.toString()} diamonds=${diamonds.toString()}`,
  );
}

async function updateOrCreate<M extends Model>(
  model: ModelStatic<M>,
  createValues: CreationAttributes<M>,
  updateValues: { [key in keyof Attributes<M>]?: Attributes<M>[key] | Literal },
  where: WhereOptions<M>,
) {
  const [row, created] = await model.findCreateFind({
    defaults: createValues,
    where,
  });
  if (!created) {
    await row.update(updateValues);
  }
}

async function main() {
  const command = process.argv[2];
  if (command === "range") {
    let start = dayjs(process.argv[3]);
    let end = dayjs(process.argv[4]);
    if (!start.isValid()) {
      console.error("invalid start");
      return;
    }
    if (!end.isValid()) {
      console.error("invalid start");
      return;
    }
    start = start.startOf("day");
    end = end.startOf("day");
    if (start.valueOf() > end.valueOf()) {
      console.error("invalid start and end");
      return;
    }
    for (
      let date = start.clone();
      date.valueOf() <= end.valueOf();
      date = date.add(1, "day")
    ) {
      await addByDate(date);
    }
  } else {
    //default
    await addByDate(dayjs().startOf("day"));
  }
}

function run(task: () => Promise<any>) {
  task()
    .catch((err) => {
      console.error(err);
    })
    .finally(() => {
      process.exit();
    });
}

// switch (process.argv[1]) {
//   case "order":
//     run(createFakeOrder);
//     break;
//   default:
//     run(main);
//     break;
// }
console.log(process.argv);
