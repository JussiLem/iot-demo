---
status: "proposed"
date: 2025-06-04
decision-makers: Jussi
consulted: {list everyone whose opinions are sought (typically subject-matter experts); and with whom there is a two-way communication}
informed: {list everyone who is kept up-to-date on progress; and with whom there is a one-way communication}
---

# Stream + Lakehouse Analytics Pipeline

## Context and Problem Statement

Smart building IoT data is a high-volume, continuous and time-series in nature (sensor readings, events).
Need to have an analytics pipeline that can handle both real-time streaming data (for live metrics/alerts) and
historical batch analysis (for trends and reporting). A traditional batch-only process would delay insights
and may not meet user expectations for timely information.

The AWS Data Analytics Lens suggests exploring modern data architecture like streaming data pipelines and
data lakes to maximize the value of such data[amazon.com](https://docs.aws.amazon.com/wellarchitected/latest/analytics-lens/characteristics.html#:~:text=In%20this%20step%2C%20you%20focus,built%20analytics%20and%20machine%20learning).
Lens notes that many organizations process data on a daily schedule, but gaining access to up-to-date data (streaming or micro-batches)
can significantly enhance insights. There's also a challenge of avoiding data silos, so need to have an integrated "lakehouse"
repository so all personas draw from a consistent data source rather than scattered databases. Modern analytics approaches
(data lakes, data mesh) help break down silos.


## Decision

Implement a unified streaming data lake pipeline.
Ingest data device telemetry through AWS IoT Core into Amazon Kinesis (for streaming) and Amazon S3 (for the data lake).
The architecture is as follows:
IoT Core MQTT topics ingest device data, an IoT rule forwards the data into **Kinesis Data Stream**.
From kinesis, data flows into a **Kinesis Data Firehose** stream that batches and lands raw data into S3 in near real-time.
In parallel use **Amazon Managed Service for Apache Flink** to perform real-time processing on the stream to detect anomalies, compute aggregates, or generate notes.

Processed results can be sent to downstream targets (another firehose to S3, a notification service, database, etc.).
All raw data and processed gets data is stored in an **S3 Data lake**, cataloged in AWS Glue Data Catalog.
Open table format (Apache Iceberg) on S3 to get an ACID type of transactions and easier schema evolution for time-series data.
Leverage AWS Lake Formation to enforce fine-grained access controls on the data lake
Pipeline is entirely serverless/managed (IoT Core, Kinesis, Firehose, Flink, S3, Glue, Athena) to reduce operational overhead.

## Rationale

Decision provides speed and flexibility. Streaming ingestion ensures low latency from device to dashboard.
Landing data in S3 in a structured way establishes a single source of truth for historical analysis.
AWS Analytic Lens encourages increasing data velocity and points out that AWS managed streaming services
mitigate complexity related to streaming.

Kinesis Data Streams and Firehose are fully managed and scalable, enabling ingesting and persisting data without managing
Kafka infrastructure. Using a data lake on S3 is cost-effective and scalable for IoT data and with Lake Formation it's possible
to secure and share data easily across accounts or tenants as needed.

Pipeline aligns with Well-Architected best practices by eliminating silos and enabling both streaming and batch analytics
from a unified dataset.

### Consequences

* Good, because we gain a highly scalable, low-maintenance pipeline through the use of managed services. 
* Good, because storing all data in S3 allows plugging in many analytics tools (Athena for SQL querying, QuickSight for BI dashboards, SageMaker for ML) on the same data with ease. 
* Good, because the streaming + lakehouse architecture positions well for future growth (more data sources, ML analytics, cross-tenant analytics) while meeting immediate needs. 
* Neutral, because the use of many AWS managed services in concert introduces some complexity in configuration, but it significantly reduces the undifferentiated heavy lifting of maintaining servers or cluster infrastructure. 
* Bad, because by choosing Kinesis and Flink, we accept a learning curve to develop and tune streaming jobs. 
* Neutral, because simpler alternatives (like AWS IoT Analytics service, or Amazon Timestream for time-series storage) were considered, but opted for the data lake approach for maximum flexibility. 
* Neutral, because if managing Flink proves too complex for MVP timelines, we might initially replace certain real-time analytics with AWS Lambda functions or rules and introduce Flink in a later iteration. 
* Bad, because there are some gaps (e.g., no data warehouse for quick relational queries) that may need to be filled in later evolutions if needed (for example, adding Amazon Redshift or implementing materialized views on the data lake).