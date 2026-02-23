import { defineLink } from "@medusajs/framework/utils";
import StatisticsModule from "../modules/statistics";
import UserModule from "@medusajs/medusa/user";

export default defineLink(
    {
        linkable: StatisticsModule.linkable.statisticsAlert,
        isList: true
    },
    {
        linkable: UserModule.linkable.user,
        isList: true
    }
);
