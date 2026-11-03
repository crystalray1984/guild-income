import dayjs, { Dayjs } from "dayjs";
import Decimal from "decimal.js";
import { random } from "lodash";
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
  Orders,
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
      `,
      values: [
        ["iospay", "googlepay_bmiss"],
        monthStart.unix(),
        date.clone().add(1, "days").unix(),
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

  //查询招商收益
  const merchatProfit = await GuildProfitReport.sum("investment_profit", {
    where: {
      guild_id: config.root_merchant_id,
      day_time: {
        [Op.between]: [
          parseInt(monthStart.format("YYYYMMDD")),
          parseInt(date.format("YYYYMMDD")),
        ],
      },
    },
  });

  //内购充值拿5%
  let sum = Decimal(iapRechargeRows[0].money).mul("0.05");

  //三方充值拿手续费差
  thirdRechargeRows.forEach((third) => {
    const delta = Decimal(third.fee_ratio).sub(third.origin_fee_ratio);
    if (delta.greaterThan(0)) {
      sum = sum.add(Decimal(third.diamonds).mul(delta).div(100));
    }
  });

  //系统招商公会拿3分之一
  sum.add(Decimal(merchatProfit).div(3));

  return sum;
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
  }

  const min = ratio.mul(1500);
  const max = ratio.mul(3300);

  const giftPrice = max.sub(min).mul(Math.random()).add(min).floor();
  const giftPriceMoney = giftPrice.div(10);
  const diamonds = giftPrice.mul(config.guild_per).toDecimalPlaces(3);
  const diamondsMoney = diamonds.div(10);

  const consume = giftPrice.div(2).ceil().toNumber();

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
    `date=${date.format("YYYY-MM-DD")} week=${date.day()} ratio=${ratio.toString()} price=${giftPrice.toString()} diamonds=${diamonds.toString()}`,
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

async function test2() {
  const end = dayjs("2026/10/31 0:00:00");
  for (
    let date = dayjs("2026/10/01 0:00:00");
    date.valueOf() <= end.valueOf();
    date = date.add(1, "day")
  ) {
    const usable = await getUsableProfit(date);
    console.log(date.format("YYYY-MM-DD"), usable.toFixed(2));
  }
}

// main()
//   .catch((err) => {
//     console.error(err);
//   })
//   .finally(() => {
//     process.exit();
//   });
