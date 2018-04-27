# Nucleus Demo

You can use this demo to simulate a simple distributed architecture using an API Gateway REST service and a Ping service
that publishes one action named "Ping".

1. Open 3 terminals;
2. In the first one, initialize the "Ping" service:
    ```bash
    $ node $PATH_TO_PROJECT/demo/Ping
    ```
3. In the second one, initialize the "APIGateway" service:
    ```bash
    $ node $PATH_TO_PROJECT/demo/Ping
    ```
3. In the third one, use `curl` to make the HTTP request:
    ```bash
    $ curl 127.0.0.1:3000/ping
    ```

You will see the API Gateway service handling your HTTP request and dispatching it to the Ping service. Then the Ping
service will execute the requested action using the `ping` method. Once the action resolve, the response is picked-up
by the API Gateway service which finally replies to the HTTP request. `200 OK`!

