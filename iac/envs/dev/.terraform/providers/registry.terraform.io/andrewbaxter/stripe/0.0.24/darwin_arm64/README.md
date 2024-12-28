This is an unofficial Terraform provider for [Stripe](https://stripe.com/) automatically generated from their OpenAPI spec.

If you find any issues with it or it needs to be updated please let me know!

This is now (as of 2022-11-26) nominally working. If this works for you I'd also like to hear!

* [Terraform Registry](https://registry.terraform.io/providers/andrewbaxter/stripe)

# Installation with Terraform

See the dropdown on the Registry page.

# Installation with Terraform CDK

Run

```
cdktf provider add andrewbaxter/stripe
```

# Documentation

See the Registry or look at `docs/`.

# Building

Make sure git submodules are cloned and up to date with `git submodule update --init`.

Run

```
./build.sh
```

This will generate the source files and render the docs.

# Troubleshooting

You can see some info on the HTTP requests by setting environment variable
```
TF_LOG_PROVIDER=JSON
```

before running Terraform.

# Technical details

Terraform spec challenges
1. Objects nested under objects aren't allowed. There's a workaround (`TfSource` and `TfDest`) implemented that abstracts around flattening child fields into the parent object. This is decently clean.
2. Objects can't be placed in arbitrary KV maps. The workaround here is a `FakeMap` which is an array with an extra `key` field which gets transformed into/from a map on the api side. This is decently clean.
3. No support for unions. This is partially worked around by provider-side validation, but it might not be perfect (some invalid configs may be let through - hopefully caught by the API itself).

Stripe API challenges
1. Malformed objects, enums, enums with only one empty element, empty objects, etc.
2. Infinite reference loops

Working around the Stripe issues ended up being very ugly, I'm hoping I can clean up the workarounds to at least make the code more readable at some point.