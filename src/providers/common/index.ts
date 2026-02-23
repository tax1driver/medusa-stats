import { MedusaError, ModuleProvider } from "@medusajs/framework/utils";
import { z } from "zod";
import {
    AbstractStatisticsProvider,
    AvailableStatistic,
    StatBuilder,
    CalculateStatisticInput,
    createTimeSeries,
    count,
    sum,
    average,
    StatisticResult
} from "medusa-stats";
import { logger, Query } from "@medusajs/framework";

class CommonStatisticsProvider extends AbstractStatisticsProvider {
    static identifier = "common-statistics";
    static displayName = "Common Statistics Provider";

    async getAvailableStatistics(): Promise<AvailableStatistic[]> {
        return [

            new StatBuilder("cart_progress_breakdown", "Cart Progress Breakdown")
                .description("Break down carts by their progress stage")
                .field({
                    name: "include_completed",
                    label: "Include Completed",
                    description: "Include completed carts in the breakdown",
                    schema: z.boolean().default(false),
                    fieldType: "boolean"
                }, false)
                .chart("pie")
                .dimension("category")
                .build(),

            new StatBuilder("average_cart_value", "Average Cart Value")
                .description("Average value of carts over time")
                .field({
                    name: "currency_code",
                    label: "Currency",
                    description: "Filter by currency code",
                    schema: z.string().optional(),
                    fieldType: "text",
                    placeholder: "USD"
                })
                .field({
                    name: "status",
                    label: "Cart Status",
                    description: "Filter by cart status",
                    schema: z.enum(["all", "completed", "active", "abandoned"]).default("all"),
                    fieldType: "select",
                    options: [
                        { value: "all", label: "All Carts" },
                        { value: "completed", label: "Completed" },
                        { value: "active", label: "Active" },
                        { value: "abandoned", label: "Abandoned" }
                    ]
                }, "all")
                .chart("line")
                .dimension("time")
                .build(),

            new StatBuilder("abandoned_cart_value", "Abandoned Cart Value")
                .description("Average value of abandoned carts")
                .field({
                    name: "currency_code",
                    label: "Currency",
                    description: "Filter by currency code",
                    schema: z.string().optional(),
                    fieldType: "text",
                    placeholder: "USD"
                })
                .field({
                    name: "abandoned_after_hours",
                    label: "Abandoned After Hours",
                    description: "Consider cart abandoned after this many hours",
                    schema: z.number().min(1).max(168).default(24),
                    fieldType: "number"
                }, 24)
                .chart("line")
                .dimension("time")
                .build(),

            new StatBuilder("total_cart_value", "Total Cart Value")
                .description("Total value of all carts over time")
                .field({
                    name: "currency_code",
                    label: "Currency",
                    description: "Filter by currency code",
                    schema: z.string().optional(),
                    fieldType: "text",
                    placeholder: "USD"
                })
                .chart("line")
                .dimension("time")
                .build(),


            new StatBuilder("order_refund_ratio", "Order Refund Ratio")
                .description("Ratio of refunds to total sales (%)")
                .field({
                    name: "currency_code",
                    label: "Currency",
                    description: "Filter by currency code",
                    schema: z.string().optional(),
                    fieldType: "text",
                    placeholder: "USD"
                })
                .chart("line")
                .dimension("time")
                .build(),

            new StatBuilder("order_promotion_ratio", "Order Promotion Ratio")
                .description("Ratio of discounts to total sales (%)")
                .chart("line")
                .dimension("time")
                .build(),

            new StatBuilder("total_promotions_value", "Total Promotions Value")
                .description("Total value of discounts applied to orders")
                .field({
                    name: "currency_code",
                    label: "Currency",
                    description: "Filter by currency code",
                    schema: z.string().optional(),
                    fieldType: "text",
                    placeholder: "USD"
                })
                .chart("line")
                .dimension("time")
                .build(),

            new StatBuilder("orders_by_status", "Orders by Status")
                .description("Count of orders grouped by status")
                .field({
                    name: "statuses",
                    label: "Statuses",
                    description: "Order statuses to include",
                    schema: z.array(z.string()).default(["pending", "completed", "canceled", "requires_action"]),
                    fieldType: "multiselect",
                    options: [
                        { value: "pending", label: "Pending" },
                        { value: "completed", label: "Completed" },
                        { value: "canceled", label: "Canceled" },
                        { value: "requires_action", label: "Requires Action" }
                    ]
                }, ["pending", "completed", "canceled", "requires_action"])
                .chart("bar")
                .dimension("category")
                .build(),

            new StatBuilder("average_units_per_order", "Average Units per Order")
                .description("Average number of items per order")
                .chart("line")
                .dimension("time")
                .build(),

            new StatBuilder("orders_by_time", "Orders by Time")
                .description("Number of orders over time")
                .field({
                    name: "status",
                    label: "Order Status",
                    description: "Filter by order status",
                    schema: z.enum(["all", "completed", "pending", "canceled"]).default("completed"),
                    fieldType: "select",
                    options: [
                        { value: "all", label: "All Orders" },
                        { value: "completed", label: "Completed" },
                        { value: "pending", label: "Pending" },
                        { value: "canceled", label: "Canceled" }
                    ]
                }, "completed")
                .chart("line")
                .dimension("time")
                .build(),

            new StatBuilder("orders_chart", "Orders Chart")
                .description("Comprehensive orders visualization")
                .field({
                    name: "metric",
                    label: "Metric",
                    description: "What to measure",
                    schema: z.enum(["count", "total_value", "average_value"]).default("count"),
                    fieldType: "select",
                    options: [
                        { value: "count", label: "Order Count" },
                        { value: "total_value", label: "Total Value" },
                        { value: "average_value", label: "Average Value" }
                    ]
                }, "count")
                .chart("line")
                .dimension("time")
                .build(),

            new StatBuilder("regions_popularity", "Regions Popularity")
                .description("Most popular regions by order count")
                .field({
                    name: "limit",
                    label: "Limit",
                    description: "Number of regions to show",
                    schema: z.number().min(1).max(50).default(10),
                    fieldType: "number"
                }, 10)
                .chart("bar")
                .dimension("category")
                .build(),

            new StatBuilder("sales_channel_popularity", "Sales Channel Popularity")
                .description("Order count by sales channel")
                .chart("pie")
                .dimension("category")
                .build(),

            new StatBuilder("orders_frequency_distribution", "Orders Frequency Distribution")
                .description("Distribution of time between repeat orders")
                .field({
                    name: "bucket_size",
                    label: "Bucket Size (days)",
                    description: "Size of time buckets in days",
                    schema: z.number().min(1).max(365).default(7),
                    fieldType: "number"
                }, 7)
                .chart("bar")
                .dimension("category")
                .build(),

            new StatBuilder("payment_provider_popularity", "Payment Provider Popularity")
                .description("Most popular payment providers")
                .chart("bar")
                .dimension("category")
                .build(),


            new StatBuilder("average_sales", "Average Sales")
                .description("Average sales value over time")
                .field({
                    name: "currency_code",
                    label: "Currency",
                    description: "Filter by currency code",
                    schema: z.string().optional(),
                    fieldType: "text",
                    placeholder: "USD"
                })
                .chart("line")
                .dimension("time")
                .build(),

            new StatBuilder("sales_per_channel", "Sales per Channel")
                .description("Total sales by sales channel")
                .field({
                    name: "currency_code",
                    label: "Currency",
                    description: "Filter by currency code",
                    schema: z.string().optional(),
                    fieldType: "text",
                    placeholder: "USD"
                })
                .chart("bar")
                .dimension("category")
                .build(),

            new StatBuilder("net_sales", "Net Sales")
                .description("Net sales after discounts and refunds")
                .field({
                    name: "currency_code",
                    label: "Currency",
                    description: "Filter by currency code",
                    schema: z.string().optional(),
                    fieldType: "text",
                    placeholder: "USD"
                })
                .field({
                    name: "include_tax",
                    label: "Include Tax",
                    description: "Include tax in net sales calculation",
                    schema: z.boolean().default(true),
                    fieldType: "boolean"
                }, true)
                .chart("line")
                .dimension("time")
                .build(),

            new StatBuilder("sales_by_time", "Sales by Time")
                .description("Total sales over time")
                .field({
                    name: "currency_code",
                    label: "Currency",
                    description: "Filter by currency code",
                    schema: z.string().optional(),
                    fieldType: "text",
                    placeholder: "USD"
                })
                .chart("line")
                .dimension("time")
                .build(),

            new StatBuilder("sales_by_currency", "Sales by Currency")
                .description("Total sales grouped by currency")
                .chart("pie")
                .dimension("category")
                .build(),

            new StatBuilder("sales_chart", "Sales Chart")
                .description("Comprehensive sales visualization")
                .field({
                    name: "currency_code",
                    label: "Currency",
                    description: "Filter by currency code",
                    schema: z.string().optional(),
                    fieldType: "text",
                    placeholder: "USD"
                })
                .field({
                    name: "include_refunds",
                    label: "Include Refunds",
                    description: "Whether to subtract refunds from sales",
                    schema: z.boolean().default(false),
                    fieldType: "boolean"
                }, false)
                .chart("line")
                .dimension("time")
                .build(),

            new StatBuilder("refunds_total", "Refunds Total")
                .description("Total refunds over time")
                .field({
                    name: "currency_code",
                    label: "Currency",
                    description: "Filter by currency code",
                    schema: z.string().optional(),
                    fieldType: "text",
                    placeholder: "USD"
                })
                .chart("line")
                .dimension("time")
                .build(),


            new StatBuilder("average_sales_per_customer", "Average Sales per Customer")
                .description("Average sales value per customer")
                .field({
                    name: "currency_code",
                    label: "Currency",
                    description: "Filter by currency code",
                    schema: z.string().optional(),
                    fieldType: "text",
                    placeholder: "USD"
                })
                .field({
                    name: "customer_segment",
                    label: "Customer Segment",
                    description: "Filter by customer segment",
                    schema: z.enum(["all", "new", "returning"]).default("all"),
                    fieldType: "select",
                    options: [
                        { value: "all", label: "All Customers" },
                        { value: "new", label: "New Customers" },
                        { value: "returning", label: "Returning Customers" }
                    ]
                }, "all")
                .chart("line")
                .dimension("time")
                .build(),

            new StatBuilder("customer_lifetime_value", "Customer Lifetime Value")
                .description("Average lifetime value per customer")
                .field({
                    name: "currency_code",
                    label: "Currency",
                    description: "Filter by currency code",
                    schema: z.string().optional(),
                    fieldType: "text",
                    placeholder: "USD"
                })
                .chart("line")
                .dimension("time")
                .build(),

            new StatBuilder("new_customers_by_time", "New Customers by Time")
                .description("Number of new customers over time")
                .chart("line")
                .dimension("time")
                .build(),

            new StatBuilder("repeat_customer_rate", "Repeat Customer Rate")
                .description("Percentage of customers who made multiple orders")
                .field({
                    name: "minimum_orders",
                    label: "Minimum Orders",
                    description: "Minimum orders to be considered repeat customer",
                    schema: z.number().min(2).max(10).default(2),
                    fieldType: "number"
                }, 2)
                .chart("line")
                .dimension("time")
                .build(),

            new StatBuilder("customers_chart", "Customers Chart")
                .description("Comprehensive customer visualization")
                .field({
                    name: "metric",
                    label: "Metric",
                    description: "What to measure",
                    schema: z.enum(["total", "new", "active", "repeat"]).default("total"),
                    fieldType: "select",
                    options: [
                        { value: "total", label: "Total Customers" },
                        { value: "new", label: "New Customers" },
                        { value: "active", label: "Active Customers" },
                        { value: "repeat", label: "Repeat Customers" }
                    ]
                }, "total")
                .chart("line")
                .dimension("time")
                .build(),

            new StatBuilder("cumulative_customers", "Cumulative Customers")
                .description("Cumulative customer count over time")
                .chart("line")
                .dimension("time")
                .build(),

            new StatBuilder("customer_retention_rate", "Customer Retention Rate")
                .description("Percentage of customers retained over time")
                .field({
                    name: "cohort_period",
                    label: "Cohort Period",
                    description: "Period for cohort analysis",
                    schema: z.enum(["day", "week", "month", "quarter"]).default("month"),
                    fieldType: "select",
                    options: [
                        { value: "day", label: "Daily" },
                        { value: "week", label: "Weekly" },
                        { value: "month", label: "Monthly" },
                        { value: "quarter", label: "Quarterly" }
                    ]
                }, "month")
                .chart("line")
                .dimension("time")
                .build(),


            new StatBuilder("top_variants", "Top Variants")
                .description("Top selling product variants")
                .field({
                    name: "limit",
                    label: "Limit",
                    description: "Number of variants to show",
                    schema: z.number().min(1).max(100).default(20),
                    fieldType: "number"
                }, 20)
                .field({
                    name: "metric",
                    label: "Metric",
                    description: "Sort by quantity or revenue",
                    schema: z.enum(["quantity", "revenue"]).default("quantity"),
                    fieldType: "select",
                    options: [
                        { value: "quantity", label: "Quantity Sold" },
                        { value: "revenue", label: "Revenue Generated" }
                    ]
                }, "quantity")
                .chart("bar")
                .dimension("category")
                .build(),

            new StatBuilder("top_returned_variants", "Top Returned Variants")
                .description("Most frequently returned product variants")
                .field({
                    name: "limit",
                    label: "Limit",
                    description: "Number of variants to show",
                    schema: z.number().min(1).max(100).default(20),
                    fieldType: "number"
                }, 20)
                .chart("bar")
                .dimension("category")
                .build(),

            new StatBuilder("products_sold_count", "Products Sold Count")
                .description("Count of products/units sold over time")
                .field({
                    name: "count_type",
                    label: "Count Type",
                    description: "Count unique products or total units",
                    schema: z.enum(["total_units", "unique_products"]).default("total_units"),
                    fieldType: "select",
                    options: [
                        { value: "total_units", label: "Total Units" },
                        { value: "unique_products", label: "Unique Products" }
                    ]
                }, "total_units")
                .chart("line")
                .dimension("time")
                .build(),

            new StatBuilder("out_of_stock_variants", "Out of Stock Variants")
                .description("Number of out of stock variants")
                .field({
                    name: "location_id",
                    label: "Location ID",
                    description: "Filter by stock location",
                    schema: z.string().optional(),
                    fieldType: "text"
                })
                .field({
                    name: "threshold",
                    label: "Stock Threshold",
                    description: "Consider out of stock below this level",
                    schema: z.number().min(0).default(0),
                    fieldType: "number"
                }, 0)
                .chart("number")
                .dimension("time")
                .build()
        ];
    }

    async calculateStatistic(input: CalculateStatisticInput): Promise<StatisticResult> {
        const { id, parameters, periodStart, periodEnd, interval } = input;

        logger.info(`Calculating statistic ${id} from ${periodStart} to ${periodEnd} with interval ${interval}`);

        switch (id) {


            case "cart_progress_breakdown": {
                const includeCompleted = parameters.include_completed ?? false;

                const filters: any = {
                    created_at: { $gte: periodStart, $lte: periodEnd }
                };

                if (!includeCompleted) {
                    filters.completed_at = null;
                }

                const { data: carts } = await this.query.graph({
                    entity: "cart",
                    fields: ["id", "completed_at", "email", "customer_id", "payment_collection.*"],
                    filters
                });


                const breakdown: Record<string, number> = {
                    "Empty": 0,
                    "With Items": 0,
                    "Customer Info": 0,
                    "Payment": 0,
                    "Completed": 0
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
                    metadata: { total: carts.length }
                };
            }

            case "average_cart_value": {
                const currencyCode = parameters.currency_code;
                const status = parameters.status ?? "all";

                const filters: any = {
                    created_at: { $gte: periodStart, $lte: periodEnd }
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
                    filters
                });

                const timeSeries = createTimeSeries(
                    carts,
                    periodStart,
                    periodEnd,
                    interval,
                    average('total')
                );

                return { value: timeSeries };
            }

            case "abandoned_cart_value": {
                const currencyCode = parameters.currency_code;
                const abandonedAfterHours = parameters.abandoned_after_hours ?? 24;

                const cutoff = new Date(Date.now() - abandonedAfterHours * 60 * 60 * 1000);

                const filters: any = {
                    created_at: { $gte: periodStart, $lte: periodEnd },
                    completed_at: null,
                    updated_at: { $lt: cutoff }
                };

                if (currencyCode) {
                    filters.currency_code = currencyCode;
                }

                const { data: carts } = await this.query.graph({
                    entity: "cart",
                    fields: ["id", "created_at", "total"],
                    filters
                });

                const timeSeries = createTimeSeries(
                    carts,
                    periodStart,
                    periodEnd,
                    interval,
                    average('total')
                );

                return {
                    value: timeSeries,
                    metadata: { abandonedCount: carts.length }
                };
            }

            case "total_cart_value": {
                const currencyCode = parameters.currency_code;

                const filters: any = {
                    created_at: { $gte: periodStart, $lte: periodEnd }
                };

                if (currencyCode) {
                    filters.currency_code = currencyCode;
                }

                const { data: carts } = await this.query.graph({
                    entity: "cart",
                    fields: ["id", "created_at", "total"],
                    filters
                });

                const timeSeries = createTimeSeries(
                    carts,
                    periodStart,
                    periodEnd,
                    interval,
                    sum('total')
                );

                return {
                    value: timeSeries,
                    metadata: { totalCarts: carts.length }
                };
            }



            case "order_refund_ratio": {
                const currencyCode = parameters.currency_code;

                const filters: any = {
                    created_at: { $gte: periodStart, $lte: periodEnd }
                };

                if (currencyCode) {
                    filters.currency_code = currencyCode;
                }

                const { data: orders } = await this.query.graph({
                    entity: "order",
                    fields: ["id", "created_at", "total", "refunded_total"],
                    filters
                });


                const timeSeries = createTimeSeries(
                    orders,
                    periodStart,
                    periodEnd,
                    interval,
                    (items: any[]) => {
                        const totalSales = items.reduce((sum, order) => sum + (order.total || 0), 0);
                        const totalRefunds = items.reduce((sum, order) => sum + (order.refunded_total || 0), 0);
                        return totalSales > 0 ? (totalRefunds / totalSales) * 100 : 0;
                    }
                );

                return { value: timeSeries };
            }

            case "order_promotion_ratio": {
                const { data: orders } = await this.query.graph({
                    entity: "order",
                    fields: ["id", "created_at", "total", "discount_total"],
                    filters: {
                        created_at: { $gte: periodStart, $lte: periodEnd }
                    }
                });

                const timeSeries = createTimeSeries(
                    orders,
                    periodStart,
                    periodEnd,
                    interval,
                    (items: any[]) => {
                        const totalSales = items.reduce((sum, order) => sum + (order.total || 0), 0);
                        const totalDiscounts = items.reduce((sum, order) => sum + (order.discount_total || 0), 0);
                        return totalSales > 0 ? (totalDiscounts / totalSales) * 100 : 0;
                    }
                );

                return { value: timeSeries };
            }

            case "total_promotions_value": {
                const currencyCode = parameters.currency_code;

                const filters: any = {
                    created_at: { $gte: periodStart, $lte: periodEnd }
                };

                if (currencyCode) {
                    filters.currency_code = currencyCode;
                }

                const { data: orders } = await this.query.graph({
                    entity: "order",
                    fields: ["id", "created_at", "discount_total"],
                    filters
                });

                const timeSeries = createTimeSeries(
                    orders,
                    periodStart,
                    periodEnd,
                    interval,
                    sum('discount_total')
                );

                return { value: timeSeries };
            }

            case "orders_by_status": {
                const statuses = parameters.statuses ?? ["pending", "completed", "canceled", "requires_action"];

                const { data: orders } = await this.query.graph({
                    entity: "order",
                    fields: ["id", "status"],
                    filters: {
                        created_at: { $gte: periodStart, $lte: periodEnd },
                        status: { $in: statuses }
                    }
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
                    value: Object.entries(statusCounts).map(([name, value]) => ({ x: name, value }))
                };
            }

            case "average_units_per_order": {
                const { data: orders } = await this.query.graph({
                    entity: "order",
                    fields: ["id", "created_at", "items.detail.quantity"],
                    filters: {
                        created_at: { $gte: periodStart, $lte: periodEnd }
                    }
                });

                console.dir(orders, { depth: null });

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

            case "orders_by_time": {
                const status = parameters.status ?? "completed";

                const filters: any = {
                    created_at: { $gte: periodStart, $lte: periodEnd }
                };

                if (status !== "all") {
                    filters.status = status;
                }

                const { data: orders } = await this.query.graph({
                    entity: "order",
                    fields: ["id", "created_at"],
                    filters
                });

                const timeSeries = createTimeSeries(
                    orders,
                    periodStart,
                    periodEnd,
                    interval,
                    count()
                );

                return { value: timeSeries };
            }

            case "orders_chart": {
                const metric = parameters.metric ?? "count";

                const { data: orders } = await this.query.graph({
                    entity: "order",
                    fields: ["id", "created_at", "total"],
                    filters: {
                        created_at: { $gte: periodStart, $lte: periodEnd }
                    }
                });

                let timeSeries;
                if (metric === "count") {
                    timeSeries = createTimeSeries(orders, periodStart, periodEnd, interval, count());
                } else if (metric === "total_value") {
                    timeSeries = createTimeSeries(orders, periodStart, periodEnd, interval, sum('total'));
                } else {
                    timeSeries = createTimeSeries(orders, periodStart, periodEnd, interval, average('total'));
                }

                return { value: timeSeries };
            }

            case "regions_popularity": {
                const limit = parameters.limit ?? 10;

                const { data: orders } = await this.query.graph({
                    entity: "order",
                    fields: ["id", "region_id"],
                    filters: {
                        created_at: { $gte: periodStart, $lte: periodEnd }
                    }
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
                    value: sorted.map(([name, value]) => ({ x: name, value }))
                };
            }

            case "sales_channel_popularity": {
                const { data: orders } = await this.query.graph({
                    entity: "order",
                    fields: ["id", "sales_channel_id"],
                    filters: {
                        created_at: { $gte: periodStart, $lte: periodEnd }
                    }
                });

                const channelCounts: Record<string, number> = {};
                for (const order of orders) {
                    const channelId = order.sales_channel_id || "Unknown";
                    channelCounts[channelId] = (channelCounts[channelId] || 0) + 1;
                }

                return {
                    value: Object.entries(channelCounts).map(([name, value]) => ({ x: name, value }))
                };
            }

            case "orders_frequency_distribution": {
                const bucketSize = parameters.bucket_size ?? 7;

                const { data: orders } = await this.query.graph({
                    entity: "order",
                    fields: ["id", "customer_id", "created_at"],
                    filters: {
                        created_at: { $gte: periodStart, $lte: periodEnd },
                        customer_id: { $ne: null }
                    }
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
                    value: Object.entries(buckets).map(([name, value]) => ({ x: name, value }))
                };
            }

            case "payment_provider_popularity": {
                const { data: payments } = await this.query.graph({
                    entity: "payment_collection",
                    fields: ["id", "payment_sessions.provider_id", "created_at"],
                    filters: {
                        created_at: { $gte: periodStart, $lte: periodEnd }
                    }
                });

                console.dir(payments, { depth: null });

                const providerCounts: Record<string, number> = {};
                for (const payment of payments) {
                    const provider = payment.payment_sessions?.[0]?.provider_id;
                    if (!provider) continue;
                    providerCounts[provider] = (providerCounts[provider] || 0) + 1;
                }

                return {
                    value: Object.entries(providerCounts).map(([name, value]) => ({ x: name, value }))
                };
            }



            case "average_sales": {
                const currencyCode = parameters.currency_code;

                const filters: any = {
                    created_at: { $gte: periodStart, $lte: periodEnd }
                };

                if (currencyCode) {
                    filters.currency_code = currencyCode;
                }

                const { data: orders } = await this.query.graph({
                    entity: "order",
                    fields: ["id", "created_at", "total"],
                    filters
                });

                const timeSeries = createTimeSeries(
                    orders,
                    periodStart,
                    periodEnd,
                    interval,
                    average('total')
                );

                return { value: timeSeries };
            }

            case "sales_per_channel": {
                const currencyCode = parameters.currency_code;

                const filters: any = {
                    created_at: { $gte: periodStart, $lte: periodEnd }
                };

                if (currencyCode) {
                    filters.currency_code = currencyCode;
                }

                const { data: orders } = await this.query.graph({
                    entity: "order",
                    fields: ["id", "sales_channel_id", "total"],
                    filters
                });

                const channelSales: Record<string, number> = {};
                for (const order of orders) {
                    const channel = order.sales_channel_id || "Unknown";
                    channelSales[channel] = (channelSales[channel] || 0) + (order.total || 0);
                }

                return {
                    value: Object.entries(channelSales).map(([name, value]) => ({ x: name, value }))
                };
            }

            case "net_sales": {
                const currencyCode = parameters.currency_code;
                const includeTax = parameters.include_tax ?? true;

                const filters: any = {
                    created_at: { $gte: periodStart, $lte: periodEnd }
                };

                if (currencyCode) {
                    filters.currency_code = currencyCode;
                }

                const { data: orders } = await this.query.graph({
                    entity: "order",
                    fields: ["id", "created_at", "total", "tax_total", "discount_total", "refunded_total"],
                    filters
                });

                const timeSeries = createTimeSeries(
                    orders,
                    periodStart,
                    periodEnd,
                    interval,
                    (items: any[]) => {
                        return items.reduce((sum, order) => {
                            let net = order.total || 0;
                            if (!includeTax) {
                                net -= (order.tax_total || 0);
                            }
                            net -= (order.discount_total || 0);
                            net -= (order.refunded_total || 0);
                            return sum + Math.max(0, net);
                        }, 0);
                    }
                );

                return { value: timeSeries };
            }

            case "sales_by_time": {
                const currencyCode = parameters.currency_code;

                const filters: any = {
                    created_at: { $gte: periodStart, $lte: periodEnd }
                };

                if (currencyCode) {
                    filters.currency_code = currencyCode;
                }

                const { data: orders } = await this.query.graph({
                    entity: "order",
                    fields: ["id", "created_at", "total"],
                    filters
                });

                const timeSeries = createTimeSeries(
                    orders,
                    periodStart,
                    periodEnd,
                    interval,
                    sum('total')
                );

                return { value: timeSeries };
            }

            case "sales_by_currency": {
                const { data: orders } = await this.query.graph({
                    entity: "order",
                    fields: ["id", "currency_code", "total"],
                    filters: {
                        created_at: { $gte: periodStart, $lte: periodEnd }
                    }
                });

                const currencySales: Record<string, number> = {};
                for (const order of orders) {
                    const currency = order.currency_code || "Unknown";
                    currencySales[currency] = (currencySales[currency] || 0) + (order.total || 0);
                }

                return {
                    value: Object.entries(currencySales).map(([name, value]) => ({ x: name, value }))
                };
            }

            case "sales_chart": {
                const currencyCode = parameters.currency_code;
                const includeRefunds = parameters.include_refunds ?? false;

                const filters: any = {
                    created_at: { $gte: periodStart, $lte: periodEnd }
                };

                if (currencyCode) {
                    filters.currency_code = currencyCode;
                }

                const { data: orders } = await this.query.graph({
                    entity: "order",
                    fields: ["id", "created_at", "total", "refunded_total"],
                    filters
                });

                const timeSeries = createTimeSeries(
                    orders,
                    periodStart,
                    periodEnd,
                    interval,
                    (items: any[]) => {
                        return items.reduce((sum, order) => {
                            const total = order.total || 0;
                            return sum + (includeRefunds ? total - (order.refunded_total || 0) : total);
                        }, 0);
                    }
                );

                return { value: timeSeries };
            }

            case "refunds_total": {
                const currencyCode = parameters.currency_code;

                const filters: any = {
                    created_at: { $gte: periodStart, $lte: periodEnd }
                };

                if (currencyCode) {
                    filters.currency_code = currencyCode;
                }

                const { data: orders } = await this.query.graph({
                    entity: "order",
                    fields: ["id", "created_at", "refunded_total"],
                    filters
                });

                const timeSeries = createTimeSeries(
                    orders,
                    periodStart,
                    periodEnd,
                    interval,
                    sum('refunded_total')
                );

                return { value: timeSeries };
            }



            case "average_sales_per_customer": {
                const currencyCode = parameters.currency_code;
                const segment = parameters.customer_segment ?? "all";

                const filters: any = {
                    created_at: { $gte: periodStart, $lte: periodEnd },
                    customer_id: { $ne: null }
                };

                if (currencyCode) {
                    filters.currency_code = currencyCode;
                }

                const { data: orders } = await this.query.graph({
                    entity: "order",
                    fields: ["id", "customer_id", "created_at", "total"],
                    filters
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
                        const uniqueCustomers = new Set(items.map(o => o.customer_id)).size;
                        const totalSales = items.reduce((sum, order) => sum + (order.total || 0), 0);
                        return uniqueCustomers > 0 ? totalSales / uniqueCustomers : 0;
                    }
                );

                return { value: timeSeries };
            }

            case "customer_lifetime_value": {
                const currencyCode = parameters.currency_code;

                const filters: any = {
                    customer_id: { $ne: null }
                };

                if (currencyCode) {
                    filters.currency_code = currencyCode;
                }


                const { data: allOrders } = await this.query.graph({
                    entity: "order",
                    fields: ["id", "customer_id", "created_at", "total"],
                    filters
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
                        const customers = new Set(items.map(o => o.customer_id));
                        const totalLTV = Array.from(customers).reduce((sum, customerId) =>
                            sum + (customerLTV[customerId] || 0), 0
                        );
                        return customers.size > 0 ? totalLTV / customers.size : 0;
                    }
                );

                return { value: timeSeries };
            }

            case "new_customers_by_time": {
                const { data: customers } = await this.query.graph({
                    entity: "customer",
                    fields: ["id", "created_at"],
                    filters: {
                        created_at: { $gte: periodStart, $lte: periodEnd }
                    }
                });

                const timeSeries = createTimeSeries(
                    customers,
                    periodStart,
                    periodEnd,
                    interval,
                    count()
                );

                return { value: timeSeries };
            }

            case "repeat_customer_rate": {
                const minimumOrders = parameters.minimum_orders ?? 2;

                const { data: orders } = await this.query.graph({
                    entity: "order",
                    fields: ["id", "customer_id", "created_at"],
                    filters: {
                        created_at: { $gte: periodStart, $lte: periodEnd },
                        customer_id: { $ne: null }
                    }
                });

                const timeSeries = createTimeSeries(
                    orders,
                    periodStart,
                    periodEnd,
                    interval,
                    (items: any[]) => {
                        const customerOrderCounts: Record<string, number> = {};
                        for (const order of items) {
                            customerOrderCounts[order.customer_id] = (customerOrderCounts[order.customer_id] || 0) + 1;
                        }

                        const uniqueCustomers = Object.keys(customerOrderCounts).length;
                        const repeatCustomers = Object.values(customerOrderCounts).filter(count => count >= minimumOrders).length;

                        return uniqueCustomers > 0 ? (repeatCustomers / uniqueCustomers) * 100 : 0;
                    }
                );

                return { value: timeSeries };
            }

            case "customers_chart": {
                const metric = parameters.metric ?? "total";

                if (metric === "total" || metric === "new") {
                    const { data: customers } = await this.query.graph({
                        entity: "customer",
                        fields: ["id", "created_at"],
                        filters: {
                            created_at: { $gte: periodStart, $lte: periodEnd }
                        }
                    });

                    const timeSeries = createTimeSeries(
                        customers,
                        periodStart,
                        periodEnd,
                        interval,
                        count()
                    );

                    return { value: timeSeries };
                } else {

                    const { data: orders } = await this.query.graph({
                        entity: "order",
                        fields: ["id", "customer_id", "created_at"],
                        filters: {
                            created_at: { $gte: periodStart, $lte: periodEnd },
                            customer_id: { $ne: null }
                        }
                    });

                    const timeSeries = createTimeSeries(
                        orders,
                        periodStart,
                        periodEnd,
                        interval,
                        (items: any[]) => {
                            if (metric === "active") {
                                return new Set(items.map(o => o.customer_id)).size;
                            } else {
                                const customerOrderCounts: Record<string, number> = {};
                                for (const order of items) {
                                    customerOrderCounts[order.customer_id] = (customerOrderCounts[order.customer_id] || 0) + 1;
                                }
                                return Object.values(customerOrderCounts).filter(count => count >= 2).length;
                            }
                        }
                    );

                    return { value: timeSeries };
                }
            }

            case "cumulative_customers": {
                const { data: customers } = await this.query.graph({
                    entity: "customer",
                    fields: ["id", "created_at"],
                    filters: {
                        created_at: { $lte: periodEnd }
                    }
                });

                const timeSeries = createTimeSeries(
                    customers,
                    periodStart,
                    periodEnd,
                    interval,
                    count()
                );


                let cumulative = 0;
                const cumulativeData = timeSeries.map((point: any) => {
                    cumulative += point.y;
                    return { x: point.x, y: cumulative };
                });

                return { value: cumulativeData };
            }

            case "customer_retention_rate": {
                const cohortPeriod = parameters.cohort_period ?? "month";




                const { data: orders } = await this.query.graph({
                    entity: "order",
                    fields: ["id", "customer_id", "created_at"],
                    filters: {
                        created_at: { $gte: periodStart, $lte: periodEnd },
                        customer_id: { $ne: null }
                    }
                });

                const timeSeries = createTimeSeries(
                    orders,
                    periodStart,
                    periodEnd,
                    interval,
                    (items: any[]) => {
                        return new Set(items.map(o => o.customer_id)).size;
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



            case "top_variants": {
                const limit = parameters.limit ?? 20;
                const metric = parameters.metric ?? "quantity";

                const { data: lineItems } = await this.query.graph({
                    entity: "order_line_item",
                    fields: ["id", "variant_id", "title", "quantity", "subtotal"],
                    filters: {
                        created_at: { $gte: periodStart, $lte: periodEnd }
                    }
                });

                const variantMetrics: Record<string, { title: string; quantity: number; revenue: number }> = {};

                for (const item of lineItems) {
                    const variantId = item.variant_id || "unknown";
                    if (!variantMetrics[variantId]) {
                        variantMetrics[variantId] = { title: item.title || variantId, quantity: 0, revenue: 0 };
                    }
                    variantMetrics[variantId].quantity += item.quantity || 0;
                    variantMetrics[variantId].revenue += item.subtotal || 0;
                }

                const sorted = Object.entries(variantMetrics)
                    .sort(([, a], [, b]) => {
                        return metric === "quantity" ? b.quantity - a.quantity : b.revenue - a.revenue;
                    })
                    .slice(0, limit);

                return {
                    value: sorted.map(([id, data]) => ({
                        x: data.title,
                        value: metric === "quantity" ? data.quantity : data.revenue
                    }))
                };
            }

            case "top_returned_variants": {
                const limit = parameters.limit ?? 20;


                const { data: returns } = await this.query.graph({
                    entity: "return",
                    fields: ["id", "items.item_id", "created_at"],
                    filters: {
                        created_at: { $gte: periodStart, $lte: periodEnd }
                    }
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
                        id: { $in: Array.from(returnedItemIds) }
                    }
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
                        value: data.count
                    }))
                };
            }

            case "products_sold_count": {
                const countType = parameters.count_type ?? "total_units";

                const { data: lineItems } = await this.query.graph({
                    entity: "order_line_item",
                    fields: ["id", "product_id", "variant_id", "quantity", "created_at"],
                    filters: {
                        created_at: { $gte: periodStart, $lte: periodEnd }
                    }
                });

                const timeSeries = createTimeSeries(
                    lineItems,
                    periodStart,
                    periodEnd,
                    interval,
                    (items: any[]) => {
                        if (countType === "unique_products") {
                            return new Set(items.map(item => item.product_id)).size;
                        } else {
                            return items.reduce((sum, item) => sum + (item.quantity || 0), 0);
                        }
                    }
                );

                return { value: timeSeries };
            }

            case "out_of_stock_variants": {
                const locationId = parameters.location_id;
                const threshold = parameters.threshold ?? 0;

                const filters: any = {
                    stocked_quantity: { $lte: threshold }
                };

                if (locationId) {
                    filters.location_id = locationId;
                }

                const { data: inventoryLevels } = await this.query.graph({
                    entity: "inventory_level",
                    fields: ["id", "inventory_item_id", "stocked_quantity"],
                    filters
                });

                return {
                    value: [{ x: new Date().toISOString(), y: inventoryLevels.length }],
                    metadata: { count: inventoryLevels.length }
                };
            }

            default:
                throw new MedusaError(
                    MedusaError.Types.NOT_FOUND,
                    `Statistic calculation not implemented: ${id}`
                );
        }
    }
}

export default ModuleProvider("statistics", { services: [CommonStatisticsProvider] });
