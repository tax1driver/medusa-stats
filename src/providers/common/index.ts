import { MedusaError, ModuleProvider } from "@medusajs/framework/utils";
import { z } from "zod";
import {
    AbstractStatisticsProvider,
    StatFn,
    StatCalculationInput,
    StatisticResult,
    createTimeSeries,
    count,
    sum,
    average,
    createQueryTimeSeries,
    generateIntervals,
} from "medusa-stats";
import { logger } from "@medusajs/framework";

const cartProgressBreakdownSchema = z.object({
    include_completed: z.boolean().default(false),
});

const averageCartValueSchema = z.object({
    currency_code: z.string().optional(),
    status: z.enum(["all", "completed", "active", "abandoned"]).default("all"),
});

const abandonedCartValueSchema = z.object({
    currency_code: z.string().optional(),
    abandoned_after_hours: z.number().min(1).max(168).default(24),
});

const totalCartValueSchema = z.object({
    currency_code: z.string().optional(),
});

const orderRefundRatioSchema = z.object({
    currency_code: z.string().optional(),
});

// order_promotion_ratio uses empty schema
const emptySchema = z.object({});

const totalPromotionsValueSchema = z.object({
    currency_code: z.string().optional(),
});

const ordersByStatusSchema = z.object({
    statuses: z.array(z.enum(["pending", "completed", "canceled", "requires_action"])).default(["pending", "completed", "canceled"]),
});

// average_units_per_order uses emptySchema

const ordersByTimeSchema = z.object({
    status: z.enum(["all", "completed", "pending", "canceled"]).default("completed"),
});

const ordersChartSchema = z.object({
    metric: z.enum(["count", "total_value", "average_value"]).default("count"),
});

const ordersFrequencyDistributionSchema = z.object({
    bucket_size: z.number().min(1).max(365).default(7),
});

const regionsPopularitySchema = z.object({
    limit: z.number().min(1).max(50).default(10),
});

// sales_channel_popularity uses emptySchema
// payment_provider_popularity uses emptySchema

const averageSalesSchema = z.object({
    currency_code: z.string().optional(),
});

const salesPerChannelSchema = z.object({
    currency_code: z.string().optional(),
});

const netSalesSchema = z.object({
    currency_code: z.string().optional(),
    include_tax: z.boolean().default(true),
});

const salesByTimeSchema = z.object({
    currency_code: z.string().optional(),
});

// sales_by_currency uses emptySchema

const salesChartSchema = z.object({
    currency_code: z.string().optional(),
    include_refunds: z.boolean().default(false),
});

const refundsTotalSchema = z.object({
    currency_code: z.string().optional(),
});

const averageSalesPerCustomerSchema = z.object({
    currency_code: z.string().optional(),
    customer_segment: z.enum(["all", "new", "returning"]).default("all"),
});

const customerLifetimeValueSchema = z.object({
    currency_code: z.string().optional(),
});

// new_customers_by_time uses emptySchema

const repeatCustomerRateSchema = z.object({
    minimum_orders: z.number().min(1).default(2),
});

const customersChartSchema = z.object({
    metric: z.enum(["total", "new", "active", "returning"]).default("total"),
});

// cumulative_customers uses emptySchema

const customerRetentionRateSchema = z.object({
    cohort_period: z.enum(["day", "week", "month"]).default("month"),
});

const topVariantsSchema = z.object({
    limit: z.number().min(1).max(100).default(20),
    metric: z.enum(["quantity", "revenue"]).default("quantity"),
});

const topReturnedVariantsSchema = z.object({
    limit: z.number().min(1).max(100).default(20),
});

const productsSoldCountSchema = z.object({
    count_type: z.enum(["total_units", "unique_products"]).default("total_units"),
});

const outOfStockVariantsSchema = z.object({
    location_id: z.string().optional(),
    threshold: z.number().min(0).default(0),
});

const gaussianRandomSchema = z.object({
    base_value: z.number().default(100),
    standard_deviation: z.number().min(0.1).max(1000).default(15),
    trend: z.number().min(-50).max(50).default(0),
    seed: z.number().int().default(42),
});


class CommonStatisticsProvider extends AbstractStatisticsProvider {
    static identifier = "common-statistics";

    @StatFn("cart_progress_breakdown", {
        schema: cartProgressBreakdownSchema,
        dimension: "category",
    })
    async cartProgressBreakdown({ parameters, periodStart, periodEnd, interval }: StatCalculationInput): Promise<StatisticResult> {
        const includeCompleted = parameters.include_completed;

        const filters: any = {
            created_at: { $gte: periodStart, $lte: periodEnd },
        };

        if (!includeCompleted) {
            filters.completed_at = null;
        }

        const { data: carts } = await this.query.graph({
            entity: "cart",
            fields: ["id", "completed_at", "email", "customer_id", "payment_collection.*"],
            filters,
        });

        const breakdown: Record<string, number> = {
            "Empty": 0,
            "With Items": 0,
            "Customer Info": 0,
            "Payment": 0,
            "Completed": 0,
        };

        for (const cart of carts) {
            if (cart.completed_at) {
                breakdown["Completed"]++;
            } else if (cart.payment_collection) {
                breakdown["Payment"]++;
            } else if (cart.email || cart.customer_id) {
                breakdown["Customer Info"]++;
            } else {
                breakdown["With Items"]++;
            }
        }

        return {
            value: Object.entries(breakdown).map(([name, value]) => ({ x: name, value })),
            metadata: { total: carts.length },
        };
    }

    @StatFn("average_cart_value", {
        schema: averageCartValueSchema,
        dimension: "time",
    })
    async averageCartValue({ parameters, periodStart, periodEnd, interval }: StatCalculationInput): Promise<StatisticResult> {
        const currencyCode = parameters.currency_code;
        const status = parameters.status;

        const filters: any = {
            created_at: { $gte: periodStart, $lte: periodEnd },
        };

        if (currencyCode) {
            filters.currency_code = currencyCode;
        }

        if (status === "completed") {
            filters.completed_at = { $ne: null };
        } else if (status === "active") {
            filters.completed_at = null;
        } else if (status === "abandoned") {
            const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
            filters.completed_at = null;
            filters.updated_at = { $lt: cutoff };
        }

        const { data: carts } = await this.query.graph({
            entity: "cart",
            fields: ["id", "created_at", "total"],
            filters,
        });

        const timeSeries = createTimeSeries(carts, periodStart, periodEnd, interval, average("total"));

        return { value: timeSeries };
    }

    @StatFn("abandoned_cart_value", {
        schema: abandonedCartValueSchema,
        dimension: "time",
    })
    async abandonedCartValue({ parameters, periodStart, periodEnd, interval }: StatCalculationInput): Promise<StatisticResult> {
        const currencyCode = parameters.currency_code;
        const abandonedAfterHours = parameters.abandoned_after_hours;

        const cutoff = new Date(Date.now() - abandonedAfterHours * 60 * 60 * 1000);

        const filters: any = {
            created_at: { $gte: periodStart, $lte: periodEnd },
            completed_at: null,
            updated_at: { $lt: cutoff },
        };

        if (currencyCode) {
            filters.currency_code = currencyCode;
        }

        const { data: carts } = await this.query.graph({
            entity: "cart",
            fields: ["id", "created_at", "total"],
            filters,
        });

        const timeSeries = createTimeSeries(carts, periodStart, periodEnd, interval, average("total"));

        return {
            value: timeSeries,
            metadata: { abandonedCount: carts.length },
        };
    }

    @StatFn("total_cart_value", {
        schema: totalCartValueSchema,
        dimension: "time",
    })
    async totalCartValue({ parameters, ...input }: StatCalculationInput): Promise<StatisticResult> {
        const currencyCode = parameters.currency_code;

        const timeSeries = await createQueryTimeSeries(this.query, input, {
            entity: "cart",
            fields: ["id", "created_at", "total"],
            filters: currencyCode ? { currency_code: currencyCode } : {},
        }, sum("total"));

        return { value: timeSeries };
    }

    @StatFn("order_refund_ratio", {
        schema: orderRefundRatioSchema,
        dimension: "time",
    })
    async orderRefundRatio({ parameters, ...input }: StatCalculationInput): Promise<StatisticResult> {
        const currencyCode = parameters.currency_code;

        const timeSeries = await createQueryTimeSeries(this.query, input, {
            entity: "order",
            fields: ["id", "created_at", "total", "refunded_total"],
            filters: currencyCode ? { currency_code: currencyCode } : {},
        }, (items: any[]) => {
            const totalSales = items.reduce((s, o) => s + (o.total || 0), 0);
            const totalRefunds = items.reduce((s, o) => s + (o.refunded_total || 0), 0);
            return totalSales > 0 ? (totalRefunds / totalSales) * 100 : 0;
        });

        return { value: timeSeries };
    }

    @StatFn("order_promotion_ratio", {
        schema: emptySchema,
        dimension: "time",
    })
    async orderPromotionRatio({ ...input }: StatCalculationInput): Promise<StatisticResult> {
        const timeSeries = await createQueryTimeSeries(this.query, input, {
            entity: "order",
            fields: ["id", "created_at", "total", "discount_total"],
        }, (items: any[]) => {
            const totalSales = items.reduce((s, o) => s + (o.total || 0), 0);
            const totalDiscounts = items.reduce((s, o) => s + (o.discount_total || 0), 0);
            return totalSales > 0 ? (totalDiscounts / totalSales) * 100 : 0;
        });

        return { value: timeSeries };
    }

    @StatFn("total_promotions_value", {
        schema: totalPromotionsValueSchema,
        dimension: "time",
    })
    async totalPromotionsValue({ parameters, ...input }: StatCalculationInput): Promise<StatisticResult> {
        const currencyCode = parameters.currency_code;

        const timeSeries = await createQueryTimeSeries(this.query, input, {
            entity: "order",
            fields: ["id", "created_at", "discount_total"],
            filters: currencyCode ? { currency_code: currencyCode } : {},
        }, sum("discount_total"));

        return { value: timeSeries };
    }

    @StatFn("orders_by_status", {
        schema: ordersByStatusSchema,
        dimension: "category",
    })
    async ordersByStatus({ parameters, periodStart, periodEnd }: StatCalculationInput): Promise<StatisticResult> {
        const statuses = parameters.statuses;

        const { data: orders } = await this.query.graph({
            entity: "order",
            fields: ["id", "status"],
            filters: {
                created_at: { $gte: periodStart, $lte: periodEnd },
                status: { $in: statuses },
            },
        });

        const statusCounts: Record<string, number> = {};
        for (const status of statuses) {
            statusCounts[status] = 0;
        }

        for (const order of orders) {
            if (order.status && statusCounts[order.status] !== undefined) {
                statusCounts[order.status]++;
            }
        }

        return {
            value: Object.entries(statusCounts).map(([name, value]) => ({ x: name, value })),
        };
    }

    @StatFn("average_units_per_order", {
        schema: emptySchema,
        dimension: "time",
    })
    async averageUnitsPerOrder({ periodStart, periodEnd, interval }: StatCalculationInput): Promise<StatisticResult> {
        const { data: orders } = await this.query.graph({
            entity: "order",
            fields: ["id", "created_at", "items.detail.quantity"],
            filters: {
                created_at: { $gte: periodStart, $lte: periodEnd },
            },
        });

        const timeSeries = createTimeSeries(
            orders,
            periodStart,
            periodEnd,
            interval,
            (items: any[]) => {
                const totalOrders = items.length;
                if (totalOrders === 0) return 0;
                const totalUnits = items.reduce((sum, order) => {
                    const orderUnits = (order.items || []).reduce((s: number, item: any) => s + (item.detail?.quantity || 0), 0);
                    return sum + orderUnits;
                }, 0);
                return totalUnits / totalOrders;
            }
        );

        return { value: timeSeries };
    }

    @StatFn("orders_by_time", {
        schema: ordersByTimeSchema,
        dimension: "time",
    })
    async ordersByTime({ parameters, ...input }: StatCalculationInput): Promise<StatisticResult> {
        const timeSeries = await createQueryTimeSeries(
            this.query,
            input,
            {
                entity: "order",
                fields: ["id", "created_at"],
                filters: {
                    status: parameters.status !== "all" ? parameters.status : undefined,
                }
            },
            count()
        );

        return { value: timeSeries };
    }

    @StatFn("orders_chart", {
        schema: ordersChartSchema,
        dimension: "time",
    })
    async ordersChart({ parameters, periodStart, periodEnd, interval }: StatCalculationInput): Promise<StatisticResult> {
        const metric = parameters.metric;

        const { data: orders } = await this.query.graph({
            entity: "order",
            fields: ["id", "created_at", "total"],
            filters: {
                created_at: { $gte: periodStart, $lte: periodEnd },
            },
        });

        let timeSeries;
        if (metric === "count") {
            timeSeries = createTimeSeries(orders, periodStart, periodEnd, interval, count());
        } else if (metric === "total_value") {
            timeSeries = createTimeSeries(orders, periodStart, periodEnd, interval, sum("total"));
        } else {
            timeSeries = createTimeSeries(orders, periodStart, periodEnd, interval, average("total"));
        }

        return { value: timeSeries };
    }

    @StatFn("orders_frequency_distribution", {
        schema: ordersFrequencyDistributionSchema,
        dimension: "category",
    })
    async ordersFrequencyDistribution({ parameters, periodStart, periodEnd }: StatCalculationInput): Promise<StatisticResult> {
        const bucketSize = parameters.bucket_size;

        const { data: orders } = await this.query.graph({
            entity: "order",
            fields: ["id", "customer_id", "created_at"],
            filters: {
                created_at: { $gte: periodStart, $lte: periodEnd },
                customer_id: { $ne: null },
            },
        });

        const customerOrders: Record<string, Date[]> = {};
        for (const order of orders) {
            if (!customerOrders[order.customer_id]) {
                customerOrders[order.customer_id] = [];
            }
            customerOrders[order.customer_id].push(new Date(order.created_at));
        }

        const timeDiffs: number[] = [];
        for (const dates of Object.values(customerOrders)) {
            if (dates.length < 2) continue;
            dates.sort((a, b) => a.getTime() - b.getTime());
            for (let i = 1; i < dates.length; i++) {
                const diffDays = (dates[i].getTime() - dates[i - 1].getTime()) / (1000 * 60 * 60 * 24);
                timeDiffs.push(diffDays);
            }
        }

        const buckets: Record<string, number> = {};
        for (const diff of timeDiffs) {
            const bucket = Math.floor(diff / bucketSize) * bucketSize;
            const bucketLabel = `${bucket}-${bucket + bucketSize} days`;
            buckets[bucketLabel] = (buckets[bucketLabel] || 0) + 1;
        }

        return {
            value: Object.entries(buckets).map(([name, value]) => ({ x: name, value })),
        };
    }

    @StatFn("regions_popularity", {
        schema: regionsPopularitySchema,
        dimension: "category",
    })
    async regionsPopularity({ parameters, periodStart, periodEnd }: StatCalculationInput): Promise<StatisticResult> {
        const limit = parameters.limit;

        const { data: orders } = await this.query.graph({
            entity: "order",
            fields: ["id", "region_id"],
            filters: {
                created_at: { $gte: periodStart, $lte: periodEnd },
            },
        });

        const regionCounts: Record<string, number> = {};
        for (const order of orders) {
            const regionId = order.region_id || "Unknown";
            regionCounts[regionId] = (regionCounts[regionId] || 0) + 1;
        }

        const sorted = Object.entries(regionCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, limit);

        return {
            value: sorted.map(([name, value]) => ({ x: name, value })),
        };
    }

    @StatFn("sales_channel_popularity", {
        schema: emptySchema,
        dimension: "category",
    })
    async salesChannelPopularity({ periodStart, periodEnd }: StatCalculationInput): Promise<StatisticResult> {
        const { data: orders } = await this.query.graph({
            entity: "order",
            fields: ["id", "sales_channel_id"],
            filters: {
                created_at: { $gte: periodStart, $lte: periodEnd },
            },
        });

        const channelCounts: Record<string, number> = {};
        for (const order of orders) {
            const channelId = order.sales_channel_id || "Unknown";
            channelCounts[channelId] = (channelCounts[channelId] || 0) + 1;
        }

        return {
            value: Object.entries(channelCounts).map(([name, value]) => ({ x: name, value })),
        };
    }

    @StatFn("payment_provider_popularity", {
        schema: emptySchema,
        dimension: "category",
    })
    async paymentProviderPopularity({ periodStart, periodEnd }: StatCalculationInput): Promise<StatisticResult> {
        const { data: payments } = await this.query.graph({
            entity: "payment_collection",
            fields: ["id", "payment_sessions.provider_id", "created_at"],
            filters: {
                created_at: { $gte: periodStart, $lte: periodEnd },
            },
        });

        const providerCounts: Record<string, number> = {};
        for (const payment of payments) {
            const provider = payment.payment_sessions?.[0]?.provider_id;
            if (!provider) continue;
            providerCounts[provider] = (providerCounts[provider] || 0) + 1;
        }

        return {
            value: Object.entries(providerCounts).map(([name, value]) => ({ x: name, value })),
        };
    }

    @StatFn("average_sales", {
        schema: averageSalesSchema,
        dimension: "time",
    })
    async averageSales({ parameters, ...input }: StatCalculationInput): Promise<StatisticResult> {
        const currencyCode = parameters.currency_code;

        const timeSeries = await createQueryTimeSeries(this.query, input, {
            entity: "order",
            fields: ["id", "created_at", "total"],
            filters: currencyCode ? { currency_code: currencyCode } : {},
        }, average("total"));

        return { value: timeSeries };
    }

    @StatFn("sales_per_channel", {
        schema: salesPerChannelSchema,
        dimension: "category",
    })
    async salesPerChannel({ parameters, periodStart, periodEnd }: StatCalculationInput): Promise<StatisticResult> {
        const currencyCode = parameters.currency_code;

        const filters: any = {
            created_at: { $gte: periodStart, $lte: periodEnd },
        };

        if (currencyCode) {
            filters.currency_code = currencyCode;
        }

        const { data: orders } = await this.query.graph({
            entity: "order",
            fields: ["id", "sales_channel_id", "total"],
            filters,
        });

        const channelSales: Record<string, number> = {};
        for (const order of orders) {
            const channel = order.sales_channel_id || "Unknown";
            channelSales[channel] = (channelSales[channel] || 0) + (order.total || 0);
        }

        return {
            value: Object.entries(channelSales).map(([name, value]) => ({ x: name, value })),
        };
    }

    @StatFn("net_sales", {
        schema: netSalesSchema,
        dimension: "time",
    })
    async netSales({ parameters, ...input }: StatCalculationInput): Promise<StatisticResult> {
        const currencyCode = parameters.currency_code;
        const includeTax = parameters.include_tax;

        const timeSeries = await createQueryTimeSeries(this.query, input, {
            entity: "order",
            fields: ["id", "created_at", "total", "tax_total", "discount_total", "refunded_total"],
            filters: currencyCode ? { currency_code: currencyCode } : {},
        }, (items: any[]) => {
            return items.reduce((s, o) => {
                let net = o.total || 0;
                if (!includeTax) net -= o.tax_total || 0;
                net -= o.discount_total || 0;
                net -= o.refunded_total || 0;
                return s + Math.max(0, net);
            }, 0);
        });

        return { value: timeSeries };
    }

    @StatFn("sales_by_time", {
        schema: salesByTimeSchema,
        dimension: "time",
    })
    async salesByTime({ parameters, ...input }: StatCalculationInput): Promise<StatisticResult> {
        const currencyCode = parameters.currency_code;

        const timeSeries = await createQueryTimeSeries(this.query, input, {
            entity: "order",
            fields: ["id", "created_at", "total"],
            filters: currencyCode ? { currency_code: currencyCode } : {},
        }, sum("total"));

        return { value: timeSeries };
    }

    @StatFn("sales_by_currency", {
        schema: emptySchema,
        dimension: "category",
    })
    async salesByCurrency({ periodStart, periodEnd }: StatCalculationInput): Promise<StatisticResult> {
        const { data: orders } = await this.query.graph({
            entity: "order",
            fields: ["id", "currency_code", "total"],
            filters: {
                created_at: { $gte: periodStart, $lte: periodEnd },
            },
        });

        const currencySales: Record<string, number> = {};
        for (const order of orders) {
            const currency = order.currency_code || "Unknown";
            currencySales[currency] = (currencySales[currency] || 0) + (order.total || 0);
        }

        return {
            value: Object.entries(currencySales).map(([name, value]) => ({ x: name, value })),
        };
    }

    @StatFn("sales_chart", {
        schema: salesChartSchema,
        dimension: "time",
    })
    async salesChart({ parameters, ...input }: StatCalculationInput): Promise<StatisticResult> {
        const currencyCode = parameters.currency_code;
        const includeRefunds = parameters.include_refunds;

        const timeSeries = await createQueryTimeSeries(this.query, input, {
            entity: "order",
            fields: ["id", "created_at", "total", "refunded_total"],
            filters: currencyCode ? { currency_code: currencyCode } : {},
        }, (items: any[]) => {
            return items.reduce((s, o) => {
                const total = o.total || 0;
                return s + (includeRefunds ? total - (o.refunded_total || 0) : total);
            }, 0);
        });

        return { value: timeSeries };
    }

    @StatFn("refunds_total", {
        schema: refundsTotalSchema,
        dimension: "time",
    })
    async refundsTotal({ parameters, ...input }: StatCalculationInput): Promise<StatisticResult> {
        const currencyCode = parameters.currency_code;

        const timeSeries = await createQueryTimeSeries(this.query, input, {
            entity: "order",
            fields: ["id", "created_at", "refunded_total"],
            filters: currencyCode ? { currency_code: currencyCode } : {},
        }, sum("refunded_total"));

        return { value: timeSeries };
    }

    @StatFn("average_sales_per_customer", {
        schema: averageSalesPerCustomerSchema,
        dimension: "time",
    })
    async averageSalesPerCustomer({ parameters, periodStart, periodEnd, interval }: StatCalculationInput): Promise<StatisticResult> {
        const currencyCode = parameters.currency_code;
        const segment = parameters.customer_segment;

        const filters: any = {
            created_at: { $gte: periodStart, $lte: periodEnd },
            customer_id: { $ne: null },
        };

        if (currencyCode) {
            filters.currency_code = currencyCode;
        }

        const { data: orders } = await this.query.graph({
            entity: "order",
            fields: ["id", "customer_id", "created_at", "total"],
            filters,
        });

        let filteredOrders = orders;
        if (segment === "new" || segment === "returning") {
            const customerFirstOrder: Record<string, Date> = {};
            for (const order of orders) {
                const existing = customerFirstOrder[order.customer_id];
                const orderDate = new Date(order.created_at);
                if (!existing || orderDate < existing) {
                    customerFirstOrder[order.customer_id] = orderDate;
                }
            }

            filteredOrders = orders.filter((order: any) => {
                const isFirst = customerFirstOrder[order.customer_id]?.getTime() === new Date(order.created_at).getTime();
                return segment === "new" ? isFirst : !isFirst;
            });
        }

        const timeSeries = createTimeSeries(
            filteredOrders,
            periodStart,
            periodEnd,
            interval,
            (items: any[]) => {
                const uniqueCustomers = new Set(items.map((o) => o.customer_id)).size;
                const totalSales = items.reduce((sum, order) => sum + (order.total || 0), 0);
                return uniqueCustomers > 0 ? totalSales / uniqueCustomers : 0;
            }
        );

        return { value: timeSeries };
    }

    @StatFn("customer_lifetime_value", {
        schema: customerLifetimeValueSchema,
        dimension: "time",
    })
    async customerLifetimeValue({ parameters, periodStart, periodEnd, interval }: StatCalculationInput): Promise<StatisticResult> {
        const currencyCode = parameters.currency_code;

        const filters: any = {
            customer_id: { $ne: null },
        };

        if (currencyCode) {
            filters.currency_code = currencyCode;
        }

        const { data: allOrders } = await this.query.graph({
            entity: "order",
            fields: ["id", "customer_id", "created_at", "total"],
            filters,
        });

        const customerLTV: Record<string, number> = {};
        for (const order of allOrders) {
            customerLTV[order.customer_id] = (customerLTV[order.customer_id] || 0) + (order.total || 0);
        }

        const periodOrders = allOrders.filter((o: any) => {
            const date = new Date(o.created_at);
            return date >= new Date(periodStart) && date <= new Date(periodEnd);
        });

        const timeSeries = createTimeSeries(
            periodOrders,
            periodStart,
            periodEnd,
            interval,
            (items: any[]) => {
                const customers = new Set(items.map((o) => o.customer_id));
                const totalLTV = Array.from(customers).reduce(
                    (sum, customerId) => sum + (customerLTV[customerId] || 0),
                    0
                );
                return customers.size > 0 ? totalLTV / customers.size : 0;
            }
        );

        return { value: timeSeries };
    }

    @StatFn("new_customers_by_time", {
        schema: emptySchema,
        dimension: "time",
    })
    async newCustomersByTime({ ...input }: StatCalculationInput): Promise<StatisticResult> {
        const timeSeries = await createQueryTimeSeries(this.query, input, {
            entity: "customer",
            fields: ["id", "created_at"],
        }, count());

        return { value: timeSeries };
    }

    @StatFn("repeat_customer_rate", {
        schema: repeatCustomerRateSchema,
        dimension: "time",
    })
    async repeatCustomerRate({ parameters, ...input }: StatCalculationInput): Promise<StatisticResult> {
        const minimumOrders = parameters.minimum_orders;

        const timeSeries = await createQueryTimeSeries(this.query, input, {
            entity: "order",
            fields: ["id", "customer_id", "created_at"],
            filters: { customer_id: { $ne: null } },
        }, (items: any[]) => {
            const customerOrderCounts: Record<string, number> = {};
            for (const order of items) {
                customerOrderCounts[order.customer_id] = (customerOrderCounts[order.customer_id] || 0) + 1;
            }
            const uniqueCustomers = Object.keys(customerOrderCounts).length;
            const repeatCustomers = Object.values(customerOrderCounts).filter((c) => c >= minimumOrders).length;
            return uniqueCustomers > 0 ? (repeatCustomers / uniqueCustomers) * 100 : 0;
        });

        return { value: timeSeries };
    }

    @StatFn("customers_chart", {
        schema: customersChartSchema,
        dimension: "time",
    })
    async customersChart({ parameters, periodStart, periodEnd, interval }: StatCalculationInput): Promise<StatisticResult> {
        const metric = parameters.metric;

        if (metric === "total" || metric === "new") {
            const { data: customers } = await this.query.graph({
                entity: "customer",
                fields: ["id", "created_at"],
                filters: {
                    created_at: { $gte: periodStart, $lte: periodEnd },
                },
            });

            const timeSeries = createTimeSeries(customers, periodStart, periodEnd, interval, count());

            return { value: timeSeries };
        } else {
            const { data: orders } = await this.query.graph({
                entity: "order",
                fields: ["id", "customer_id", "created_at"],
                filters: {
                    created_at: { $gte: periodStart, $lte: periodEnd },
                    customer_id: { $ne: null },
                },
            });

            const timeSeries = createTimeSeries(
                orders,
                periodStart,
                periodEnd,
                interval,
                (items: any[]) => {
                    if (metric === "active") {
                        return new Set(items.map((o) => o.customer_id)).size;
                    } else {
                        // returning
                        const customerOrderCounts: Record<string, number> = {};
                        for (const order of items) {
                            customerOrderCounts[order.customer_id] = (customerOrderCounts[order.customer_id] || 0) + 1;
                        }
                        return Object.values(customerOrderCounts).filter((count) => count >= 2).length;
                    }
                }
            );

            return { value: timeSeries };
        }
    }

    @StatFn("cumulative_customers", {
        schema: emptySchema,
        dimension: "time",
    })
    async cumulativeCustomers({ periodStart, periodEnd, interval }: StatCalculationInput): Promise<StatisticResult> {
        const { data: customers } = await this.query.graph({
            entity: "customer",
            fields: ["id", "created_at"],
            filters: {
                created_at: { $lte: periodEnd },
            },
        });

        const timeSeries = createTimeSeries(customers, periodStart, periodEnd, interval, count());

        let cumulative = 0;
        const cumulativeData = timeSeries.map((point: any) => {
            cumulative += point.value;
            return { x: point.x, value: cumulative };
        });

        return { value: cumulativeData };
    }

    @StatFn("customer_retention_rate", {
        schema: customerRetentionRateSchema,
        dimension: "time",
    })
    async customerRetentionRate({ periodStart, periodEnd, interval }: StatCalculationInput): Promise<StatisticResult> {
        const { data: orders } = await this.query.graph({
            entity: "order",
            fields: ["id", "customer_id", "created_at"],
            filters: {
                created_at: { $gte: periodStart, $lte: periodEnd },
                customer_id: { $ne: null },
            },
        });

        const timeSeries = createTimeSeries(
            orders,
            periodStart,
            periodEnd,
            interval,
            (items: any[]) => {
                return new Set(items.map((o) => o.customer_id)).size;
            }
        );

        const retentionData = timeSeries.map((point: any, index: number) => {
            if (index === 0) return { x: point.x, value: 100 };
            const previous = timeSeries[index - 1].value;
            const retained = previous > 0 ? (point.value / previous) * 100 : 0;
            return { x: point.x, value: Math.min(100, retained) };
        });

        return { value: retentionData };
    }
    @StatFn("top_variants", {
        schema: topVariantsSchema,
        dimension: "category",
    })
    async topVariants({ parameters, periodStart, periodEnd }: StatCalculationInput): Promise<StatisticResult> {
        const limit = parameters.limit;
        const metric = parameters.metric;

        const { data: lineItems } = await this.query.graph({
            entity: "order_item",
            fields: ["id", "*", "item.*"],
            filters: {
                created_at: { $gte: periodStart, $lte: periodEnd },
            },
        });

        const variantMetrics: Record<string, { title: string; quantity: number; revenue: number }> = {};
        console.dir(lineItems, { depth: null });
        for (const item of lineItems) {
            const variantId = item.item.variant_id;
            if (!variantMetrics[variantId]) {
                variantMetrics[variantId] = { title: `${item.item.title} (${item.item.subtitle})` || variantId, quantity: 0, revenue: 0 };
            }
            variantMetrics[variantId].quantity += item.quantity || 0;
            variantMetrics[variantId].revenue += item.quantity * item.unit_price || 0;
        }


        const sorted = Object.entries(variantMetrics)
            .sort(([, a], [, b]) => {
                return metric === "quantity" ? b.quantity - a.quantity : b.revenue - a.revenue;
            })
            .slice(0, limit);

        return {
            value: sorted.map(([id, data]) => ({
                x: data.title,
                value: metric === "quantity" ? data.quantity : data.revenue,
            })),
        };
    }

    @StatFn("top_returned_variants", {
        schema: topReturnedVariantsSchema,
        dimension: "category",
    })
    async topReturnedVariants({ parameters, periodStart, periodEnd }: StatCalculationInput): Promise<StatisticResult> {
        const limit = parameters.limit;

        const { data: returns } = await this.query.graph({
            entity: "return",
            fields: ["id", "items.item_id", "created_at"],
            filters: {
                created_at: { $gte: periodStart, $lte: periodEnd },
            },
        });

        const returnedItemIds = new Set(
            returns.flatMap((ret: any) => (ret.items || []).map((item: any) => item.item_id))
        );

        if (returnedItemIds.size === 0) {
            return { value: [] };
        }

        const { data: lineItems } = await this.query.graph({
            entity: "order_line_item",
            fields: ["id", "variant_id", "title", "quantity"],
            filters: {
                id: { $in: Array.from(returnedItemIds) },
            },
        });

        const variantReturns: Record<string, { title: string; count: number }> = {};

        for (const item of lineItems) {
            const variantId = item.variant_id || "unknown";
            if (!variantReturns[variantId]) {
                variantReturns[variantId] = { title: item.title || variantId, count: 0 };
            }
            variantReturns[variantId].count += item.quantity || 0;
        }

        const sorted = Object.entries(variantReturns)
            .sort(([, a], [, b]) => b.count - a.count)
            .slice(0, limit);

        return {
            value: sorted.map(([id, data]) => ({
                x: data.title,
                value: data.count,
            })),
        };
    }

    @StatFn("products_sold_count", {
        schema: productsSoldCountSchema,
        dimension: "time",
    })
    async productsSoldCount({ parameters, ...input }: StatCalculationInput): Promise<StatisticResult> {
        const countType = parameters.count_type;

        const timeSeries = await createQueryTimeSeries(this.query, input, {
            entity: "order_line_item",
            fields: ["id", "product_id", "variant_id", "quantity", "created_at"],
        }, (items: any[]) => {
            if (countType === "unique_products") {
                return new Set(items.map((item) => item.product_id)).size;
            }
            return items.reduce((s, item) => s + (item.quantity || 0), 0);
        });

        return { value: timeSeries };
    }

    @StatFn("out_of_stock_variants", {
        schema: outOfStockVariantsSchema,
        dimension: "time",
    })
    async outOfStockVariants({ parameters }: StatCalculationInput): Promise<StatisticResult> {
        const locationId = parameters.location_id;
        const threshold = parameters.threshold;

        const filters: any = {
            stocked_quantity: { $lte: threshold },
        };

        if (locationId) {
            filters.location_id = locationId;
        }

        const { data: inventoryLevels } = await this.query.graph({
            entity: "inventory_level",
            fields: ["id", "inventory_item_id", "stocked_quantity"],
            filters,
        });

        return {
            value: [{ x: new Date().toISOString(), value: inventoryLevels.length }],
            metadata: { count: inventoryLevels.length },
        };
    }

}

export default ModuleProvider("statistics", { services: [CommonStatisticsProvider] });
