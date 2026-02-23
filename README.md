<p align="center">
  <a href="https://www.medusajs.com">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://user-images.githubusercontent.com/59018053/229103275-b5e482bb-4601-46e6-8142-244f531cebdb.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://user-images.githubusercontent.com/59018053/229103726-e5b529a3-9b3f-4970-8a1f-c6af37f087bf.svg">
    <img alt="Medusa logo" src="https://user-images.githubusercontent.com/59018053/229103726-e5b529a3-9b3f-4970-8a1f-c6af37f087bf.svg">
  </picture>
  </a>
</p>

<h2 align="center">
  Medusa Stats
</h2>

<br>

## Overview

`medusa-stats` is a flexible statistics module for Medusa that features:

- Pluggable statistics providers
- Views, options, and chart composition
- Composite statistics (statistics depending on other statistics)
- Statistics-triggered configurable alerts
- UI interface and admin routes for full statistics lifecycle management
- Caching and scheduled recalculation


## Installation

```bash
npm install medusa-stats
# or
yarn add medusa-stats
```



## Configuration

Add the module to your `medusa-config.ts`:

```ts
modules: [
  // ... other modules ...
  {
    resolve: "medusa-stats",
    options: {
      providers: [
        {
          resolve: "medusa-stats/providers/statistics/common",
        },
      ],
    },
  },
]
```

## Basic Usage
The plugin provides a framework for defining and calculating statistics as well as an admin interface for their management and visualization. The primary goal of the module is to provide a flexible way to create custom statistics and views that suit your business needs, without being limited to predefined metrics. 

The module can also be used out-of-the-box with pre-defined statistics providers and the admin interface.

### Views
Views are collections of related statistics visualizations. They allow you to organize statistics in any way that suits your needs. Every chart in a view can display multiple statistical measurements, each based on a different statistic option.

(view image)

### Options
Options are instances of statistics that are calculated with specific parameters. By changing an option's parameters, you can adjust the underlying statistic calculation. 

(options paramters iamge)

When editing, options can also be configured in terms of their visualization (chart type, dimensions, etc.), cache settings and other parameters.

(visualization settings image)

## Providers

Providers define what statistics are available and how they are calculated.

### Add provider to project

Register your provider in `medusa-config.ts` under the `medusa-stats` module:

```ts
modules: [
  {
    resolve: "medusa-stats",
    options: {
      providers: [
        { resolve: "medusa-stats/providers/common" },
        { resolve: "medusa-stats/providers/composite" },
        { resolve: "./src/providers/statistics/my-provider" },
      ],
    },
  },
]
```
### Included providers

`medusa-stats` includes two built-in providers:

- `medusa-stats/providers/common`
  - General commerce statistics (orders, carts, sales, channels, regions, and related aggregates).
- `medusa-stats/providers/composite`
  - Composite/stat-transform statistics that consume other statistic outputs.
  - Included statistics: `moving_average`, `rate_of_change`.


### Creating a Statistics Provider

Create a provider class by extending `AbstractStatisticsProvider`, expose available statistics in `getAvailableStatistics`, and implement calculation logic in `calculateStatistic`.

Example: a `total_cart_value` statistic (available in the Common Statistics Provider) with filters for currency and cart status.

```ts
import { ModuleProvider } from "@medusajs/framework/utils"
import {
  AbstractStatisticsProvider,
  StatBuilder,
  createTimeSeries,
  sum,
  type AvailableStatistic,
  type CalculateStatisticInput,
  type StatisticResult,
} from "medusa-stats"

class MyStatisticsProvider extends AbstractStatisticsProvider {
  static identifier = "my-statistics"
  static displayName = "My Statistics Provider"

  async getAvailableStatistics(): Promise<AvailableStatistic[]> {
    return [
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
    ]
  }

  async calculateStatistic(input: CalculateStatisticInput): Promise<StatisticResult> {
    const { id, parameters, periodStart, periodEnd, interval } = input;
    
    switch(id) {
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

            const timeSeries = createTimeSeries( // helper function for time series creation
                carts,
                periodStart,
                periodEnd,
                interval,
                sum('total') // helper accumulator function
            );

            return {
                value: timeSeries,
                metadata: { totalCarts: carts.length }
            };
        }
    }
  }
}

export default ModuleProvider("statistics", {
  services: [MyStatisticsProvider],
})
```



## Composite Statistics

Composite statistics allow one statistic option to use another option's output as an input.

### Admin Usage
A stat option can be configured to receive another statistic's output by settings its value in the Dependecnies section when editing a stat instance in the admin dashboard.

(composite stat admin image)

### Using composite fields in providers

To make a statistic composable, define a provider parameter with `fieldType: "stat"`.
At runtime, that parameter receives dependency output data and can be processed like any other input.

```ts
import { z } from "zod"
import { StatBuilder } from "medusa-stats"

new StatBuilder("moving_average", "Moving Average")
  .description("Smooth a time series by averaging values over a rolling window")
  .field(
    {
      name: "input_series",
      label: "Input Series",
      description: "Dependency result to analyze",
      fieldType: "stat",
      schema: TimeSeriesSchema
    }
  )
  .field(
    {
      name: "window_size",
      label: "Window Size",
      fieldType: "number",
      schema: z.number().int().min(2).max(365).default(7),
    },
    7 // initial value
  )
  .build()
```

## Alerts

Alerts can be configured per option to trigger when conditions are met.

### Features

- Absolute and comparative conditions
- Cooldown period and daily trigger limits
- Alert logs
- Scheduled evaluation job
- Event-based notification requests

### Emitted Events
To handle the alert triggers, register a subscriber for the `statistics.alert` event type. 

```ts
type StatisticsAlertEventData = {
  alert_id: string
  alert_name: string
  severity: "info" | "warning" | "critical"
  option_id: string
  current_value: number
  reference_value: number | null
  compare_value: number | [number, number]
  operator: "lt" | "gt" | "lte" | "gte" | "eq" | "neq" | "between"
  comparison_type: string
}
```

