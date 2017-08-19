# Twittar

This is a silly little demo app for an offline-first web application

# Installing

```sh
npm install
```

# Running

```sh
npm run serve
```

You should now have the app server at [localhost:8888](http://localhost:8888) and the config server at [localhost:8889](http://localhost:8888).

You can also configure the ports:

```sh
npm run serve -- --server-port=8000 --config-server-port=8001
```

# Troubleshooting

- Errors while executing `npm run serve`
  - The first thing to try is to upgrade to node v6
