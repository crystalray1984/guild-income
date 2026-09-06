import { type TypeCast } from "mysql2";
import { Sequelize } from "sequelize-typescript";
import { config } from "../config";
import { AnchorDayReport } from "./AnchorDayReport";
import { Guild } from "./Guild";
import { GuildPackagePer } from "./GuildPackagePer";
import { GuildProfitReport } from "./GuildProfitReport";
import { UserAssetsConsumable } from "./UserAssetsConsumable";
import { BalanceChangeLog } from "./BalanceChangeLog";

const typeCast: TypeCast = (field, next) => {
  if (field.type === "DATETIME" || field.type === "DATETIME2") {
    const value = field.string();
    if (value === null) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return next();
};

export const db = new Sequelize({
  dialect: "mysql",
  dialectOptions: {
    typeCast,
  },
  timezone: "+08:00",
  ...config.db.main,
  models: [Guild, GuildPackagePer, BalanceChangeLog],
});

export const dbPlace = new Sequelize({
  dialect: "mysql",
  dialectOptions: {
    typeCast,
  },
  timezone: "+08:00",
  ...config.db.place,
  models: [GuildProfitReport, AnchorDayReport],
});

export const dbFinance = new Sequelize({
  dialect: "mysql",
  dialectOptions: {
    typeCast,
  },
  timezone: "+08:00",
  ...config.db.clearing,
  models: [UserAssetsConsumable],
});

export { AnchorDayReport } from "./AnchorDayReport";
export { Guild } from "./Guild";
export { GuildPackagePer } from "./GuildPackagePer";
export { GuildProfitReport } from "./GuildProfitReport";
export { UserAssetsConsumable } from "./UserAssetsConsumable";
export { BalanceChangeLog } from "./BalanceChangeLog";
