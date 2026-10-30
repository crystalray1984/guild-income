import dayjs, { Dayjs } from "dayjs";
import Decimal from "decimal.js";
import { random } from "lodash";
import {
  Attributes,
  CreationAttributes,
  literal,
  Model,
  ModelStatic,
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
import { Orders } from "./db/Orders";

process.env.TZ = "Asia/Shanghai";

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

  const channels = await db.query<{
    id: number;
    name: string;
    diamonds: string;
    money: string;
  }>(
    {
      query: `
      SELECT
        web3_pay_targets.id,
        web3_pay_type.name,
        SUM(orders.balanceadd) / 10 AS diamonds,
        SUM(orders.money) AS money
      FROM
        orders
      JOIN
        web3_pay_targets ON web3_pay_targets.id = orders.paychannel
      JOIN
        web3_pay_type ON web3_pay_type.name = web3_pay_targets.pay_channel_type
      WHERE
        orders.status = 1
        AND orders.payment_time >= ? AND orders.payment_time < ?
        AND web3_pay_type.package_group_id = ?
      GROUP BY
        web3_pay_targets.id
      `,
      values: [
        date.clone().startOf("month").unix(),
        date.clone().add(1, "day").unix(),
        config.package_group_id,
      ],
    },
    { type: QueryTypes.SELECT },
  );

  const sumChannels: Record<
    string,
    {
      channels: typeof channels;
      diamonds: Decimal;
      money: Decimal;
      ratio: Decimal;
    }
  > = {};

  channels.forEach((channel) => {
    if (!sumChannels[channel.name]) {
      sumChannels[channel.name] = {
        channels: [channel],
        diamonds: Decimal(channel.diamonds),
        money: Decimal(channel.money),
        ratio: undefined as unknown as Decimal,
      };
    } else {
      const summary = sumChannels[channel.name];
      summary.channels.push(channel);
      summary.diamonds = summary.diamonds.add(channel.diamonds);
      summary.money = summary.money.add(channel.diamonds);
    }
  });

  const channelKeys = Object.keys(sumChannels);
  for (const key of channelKeys) {
    const summary = sumChannels[key];
    const after = Decimal(summary.diamonds).add(consume);
    if (after.div(summary.money).gte("0.93")) {
      delete sumChannels[key];
    } else {
      summary.ratio = Decimal(summary.diamonds).div(summary.money);
    }
  }

  if (Object.keys(sumChannels).length === 0) {
    console.log(`date=${date.format("YYYY-MM-DD")} 无通道 退出`);
    return;
  }

  const listTypes = Object.values(sumChannels).sort((channel1, channel2) =>
    channel1.ratio.comparedTo(channel2.ratio),
  );

  const useType = listTypes[0];
  const useChannels = useType.channels.sort((c1, c2) =>
    Decimal(c2.diamonds).comparedTo(c1.diamonds),
  );
  const useChannel = useChannels[0];

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

  await BalanceChangeLog.create(
    {
      when: random(date.unix(), date.unix() + 86400, false),
      why: 99,
      money: Decimal(0).sub(consume).toString(),
      userid: 0,
      touserid: config.anchor_id,
      to_guild_id: config.guild_id,
      user_package_group_id: config.package_group_id,
      touser_package_group_id: config.package_group_id,
    },
    { returning: false },
  );

  Orders.create(
    {
      types: 0,
      adddate: day_time,
      money: "0",
      userid: config.user_id,
      status: 1,
      paychannel: useChannel.id,
      balanceadd: consume,
      agentid: 0,
      lastupdate: dayjs().unix(),
      current: dayjs().toDate(),
      create_time: dayjs().toDate(),
      is_dispose: 1,
      payment_time: dayjs().unix(),
      pay_type: useChannel.name,
    },
    { returning: false },
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

main()
  .catch((err) => {
    console.error(err);
  })
  .finally(() => {
    process.exit();
  });
