import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { type SequelizeOptions } from "sequelize-typescript";
import { parse } from "yaml";

interface ProfitRatioConfig {
  default: number | string;
  [name: string]: number | string | undefined;
}

interface ConfigData {
  guild_id: number;
  anchor_id: number;
  profit_ratio: ProfitRatioConfig;
  uuid: string;
  guild_per: number | string;
  package_group_id: number;
  db: {
    main: Partial<SequelizeOptions>;
    place: Partial<SequelizeOptions>;
    clearing: Partial<SequelizeOptions>;
  };
}

export const config = ((): ConfigData => {
  const configFile = resolve(__dirname, "../config.yaml");
  const configContent = readFileSync(configFile, "utf-8");
  return parse(configContent);
})();
