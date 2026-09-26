---
title: OpenAI Compatibility
description: GuRouter's OpenAI-compatible endpoints — chat completions and model listing.
---

GuRouter's core endpoints mirror the OpenAI API. Authentication, request bodies, and
response shapes follow OpenAI conventions, so existing OpenAI clients and SDKs work by
pointing them at a GuRouter base URL and using a GuRouter key.

## Authentication and base URL

Send your key as `Authorization: Bearer <API_KEY>` and use the base URL:

- `https://gurouter.com`

## `POST /v1/chat/completions`

OpenAI-compatible chat completions. Supports `stream: true` using OpenAI SSE conventions.
See the [Agent Setup](/getting-started/agents/) guide for curl, Python, and Node examples.

## `GET /v1/models`

Lists the models available to your key, in OpenAI's list format. Each entry includes a
`supported_endpoint_types` field describing which endpoint types the model can be used
with.

## Not a chat endpoint: SystemOne

For structured decisions rather than conversation, use `POST /v1/systemone` (model
`typesafe/jev`). It is non-chat and non-streaming — see [SystemOne](/api/systemone/) for
the request and response contract.

:::note
Only `GET /v1/models`, `POST /v1/chat/completions`, and `POST /v1/systemone` are documented
here. Other OpenAI-compatible routes (embeddings, images, audio) are not yet verified and
are intentionally left undocumented.
:::
