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

<h5 align="center">
  <a href="https://docs.medusajs.com">MedusaJS</a> |
  <a href="https://www.npmjs.com/package/medusa-stats">npm</a> |
  <a href="https://github.com/tax1driver/medusa-stats">Repository</a>
</h5>


<br>

## Overview

`medusa-stats` is an analytics visualization plugin for Medusa that features:

- Pluggable statistics providers
- Views, options, and chart composition
- Composite statistics (statistics depending on other statistics)
- Statistics-triggered configurable alerts
- Admin UI with i18n support
- Widget for embedding statistics in the admin dashboard
- Caching for optimized performance

## Installation

```bash
npm install medusa-stats
# or
yarn add medusa-stats
```

## Configuration

Add the plugin to your `medusa-config.ts`:

```typescript
modules: [
  {
    resolve: "medusa-stats/modules/statistics",
    dependencies: [ContainerRegistrationKeys.QUERY], // Query dependency is required for provider data access
    options: {
      providers: [
        {
          resolve: "medusa-stats/providers/common",
        },
      ],
    },
  },
],
plugins: [
  `medusa-stats`,
]
```

## Basic Usage

The plugin provides a framework for defining and calculating statistics as well as an admin interface for their management and visualization. The primary goal of the module is to provide a flexible way to create custom statistics and views that suit your business needs, without being limited to predefined metrics.

The module can also be used out-of-the-box with pre-defined statistics providers and the admin interface.

### Views

Views are collections of related statistics visualizations. They allow you to organize statistics in any way that suits your needs. Every chart in a view can display multiple statistical measurements, each based on a different statistic option. The view page includes a compact toolbar for switching period presets, interval settings, and grid layout sizes.

![Views Image](https://github.com/tax1driver/medusa-stats/blob/master/docs/static/view.png)

### Options

Options are instances of statistics that are calculated with specific parameters. By changing an option's parameters, you can adjust the underlying statistic calculation.

![Options Parameters Image](https://github.com/tax1driver/medusa-stats/blob/master/docs/static/params.png)

When editing, options can also be configured in terms of their visualization (chart type, series style, dimensions, colors, etc.), cache settings, and other parameters. Options can be saved as reusable **Presets**.

![Visualization Settings Image](https://github.com/tax1driver/medusa-stats/blob/master/docs/static/visualizations.png)

### Chart Types

The module supports multiple built-in chart types, selectable per series:

| Type        | Description                                        |
| ----------- | -------------------------------------------------- |
| `2d`        | Standard 2D chart (line, bar, area series)         |
| `aggregate` | Summary cards showing the latest value per series  |
| `list`      | Paginated data table with optional aggregation row |

~~Custom chart types can be added by using LayoutComposer's widget injection.~~ *todo/layout composer seemed to crash randomly while testing due to invalid context data* 

## Providers

Providers define what data is available via the providers. Each source is defined using the `@StatFn` decorator with a Zod parameter schema.

### Add provider to project

Register your provider in `medusa-config.ts` under the `medusa-stats` module:

```typescript
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

Create a provider class by extending `AbstractStatisticsProvider` and define each statistic as a method decorated with `@StatFn`. The decorator's `StatOptions` include a **Zod schema** for parameter validation, an optional preferred chart type, dimension hint, and arbitrary metadata.

Example: a `total_cart_value` statistic with a currency filter.

```typescript
import { ModuleProvider } from "@medusajs/framework/utils"
import { z } from "zod"
import {
  AbstractStatisticsProvider,
  StatFn,
  createQueryTimeSeries,
  sum,
  type StatCalculationInput,
  type StatisticResult,
} from "medusa-stats"

const totalCartValueSchema = z.object({
  currency_code: z.string().optional(),
})

class MyStatisticsProvider extends AbstractStatisticsProvider {
  static identifier = "my-statistics"

  @StatFn("total_cart_value", {
    schema: totalCartValueSchema,
  })
  async totalCartValue({ parameters, ...input }: StatCalculationInput): Promise<StatisticResult> {
    const currencyCode = parameters.currency_code

    const timeSeries = await createQueryTimeSeries(this.query, input, {
      entity: "cart",
      fields: ["id", "created_at", "total"],
      filters: currencyCode ? { currency_code: currencyCode } : {},
    }, sum("total"))

    return { value: timeSeries }
  }
}

export default ModuleProvider("statistics", {
  services: [MyStatisticsProvider],
})
```

### Helper Utilities

The package exports several data-processing utilities from `medusa-stats`:

| Function                                                        | Description                                   |
| --------------------------------------------------------------- | --------------------------------------------- |
| `createTimeSeries(data, start, end, interval, accumulator)`     | Build a time series from raw data             |
| `createQueryTimeSeries(query, input, queryParams, accumulator)` | Query + build a time series in one call       |
| `groupBy(data, keySelector, aggregator?)`                       | Group data by a key with optional aggregation |
| `generateIntervals(start, end, interval)`                       | Generate interval timestamps for a period     |
| `getIntervalBucket(date, periodStart, interval)`                | Get the interval bucket for a given date      |
| `count()`                                                       | Accumulator: count of items                   |
| `sum(field)`                                                    | Accumulator: sum of a field                   |
| `average(field, options?)`                                      | Accumulator: average of a field               |

## Composite Statistics

Composite statistics allow one statistic option to use another option's output as an input. This is configured by setting **Input Dependencies** in the option editor — map a dependency to a parameter name.

### Admin Usage

A stat option can be configured to receive another statistic's output in the Dependencies section when editing a stat instance in the admin dashboard.

![Dependencies Image](https://github.com/tax1driver/medusa-stats/blob/master/docs/static/composite.png)

### Using composite fields in providers

To make a statistic composable, define a Zod schema for the input and use `.meta({ type: "stat" })` to mark the field as a stat dependency. At runtime, that parameter receives the dependency's calculation result.

```typescript
import { z } from "zod"
import { StatFn } from "medusa-stats"

const timeSeriesSchema = z.object({
  value: z.array(z.object({
    x: z.union([z.string(), z.date(), z.number()]),
    value: z.number(),
  }))
})

const movingAverageSchema = z.object({
  input_series: timeSeriesSchema.meta({ type: "stat" }),
  window_size: z.number().int().min(2).max(365).default(7),
})

class MyProvider extends AbstractStatisticsProvider {
  @StatFn("moving_average", {
    schema: movingAverageSchema,
  })
  async movingAverage({ parameters }: StatCalculationInput): Promise<StatisticResult> {
    const inputSeries = parameters.input_series.value
    // ... compute moving average
  }
}
```

## Alerts

Alerts can be configured per option to trigger when conditions are met.

### Features

- Absolute and comparative conditions
- Alert logs
- Scheduled evaluation job
- Event emission for custom handling

### Emitted Events

To handle alert triggers, register a subscriber for the `statistics.alert` event type.

```typescript
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

## Caching

In order to optimize performance, statistic results are cached for a configurable amount of time. When a statistic is requested, the module first checks if a valid cached result exists and returns it if available. If not, it calculates the statistic, stores the result in the cache, and then returns it.

### Cache Configuration

To use caching, `CachingModule` must be enabled in the Medusa project.

```typescript
{
  resolve: "@medusajs/medusa/caching",
  options: {
    providers: [
      {
        resolve: "@medusajs/caching-redis",
        id: "caching-redis",
        is_default: true,
        options: {
          redisUrl: process.env.CACHE_REDIS_URL,
        },
      },
    ],
  },
},
```

The CachingModule's feature flag needs to be enabled as well:

*in `.env` file:*
```env
MEDUSA_FF_CACHING=true
```

or

*in `medusa-config.ts`:*
```typescript
featureFlags: {
  caching: true,
}
```

## Internationalization (i18n)

The admin UI supports translation via the Medusa provided `react-i18next` package. Custom providers can provide translation keys for their functions and fields. The following keys are used for translation:

- `sp_<provider-id>.name` - provider display name
- `sp_<provider-id>.<stat-id>.name` - function display name
- `sp_<provider-id>.<stat-id>.description` - function description
- `sp_<provider-id>.<stat-id>.fields.<field-name>.name` - parameter field label
- `sp_<provider-id>.<stat-id>.fields.<field-name>.options.<value>` - enum option label

General admin UI keys can also be translated, please see the `src/admin/i18n` folder for the english translation file.


