from typing import TYPE_CHECKING, Tuple, Dict, Any

from litestar.controller import Controller
from litestar.handlers import get, post

import requests

from litestar import Response, Request, status_codes

if TYPE_CHECKING:
    from litestar import Litestar
    from litestar.config.app import AppConfig
    from litestar.datastructures import State

HTTP_PATHS = {
    "marking": "/get_marking",
    "config": "/get_config",
    "transition": "/trigger_manual_transition",
    "token": "/add_token",
}


class BNetServer:
    host: str
    port: int

    REQ_DEFAULT_TIMEOUT_S = 0.1

    def __init__(self, host: str, port: int) -> None:
        self.host = host
        self.port = port

    def addr(self):
        return "http://" + self.host + ":" + str(self.port)

    def get_json(self, path, timeout=REQ_DEFAULT_TIMEOUT_S) -> Tuple[int, dict]:
        """
        Used to retrive info from the BNet server, e.g., config and marking
        """
        ret = requests.get(self.addr() + path, timeout=timeout)
        if ret.status_code != status_codes.HTTP_200_OK:
            print(f"BNetServer.get_json({path}) request failed with status code {ret.status_code}.")
            return [ret.status_code, {}]
        if ret.headers["content-type"] != "application/json":
            print(f"BNetServer.get_json({path}) received `{ret.status_code}`, expected `application/json`.")
            return [status_codes.HTTP_500_INTERNAL_SERVER_ERROR, {}]
        return [status_codes.HTTP_200_OK, ret.json()]

    def post_transition_trigger(self, transition_id, timeout=REQ_DEFAULT_TIMEOUT_S) -> Response:
        url = self.addr() + HTTP_PATHS["transition"] + "/" + transition_id
        ret = requests.post(url, timeout=timeout)
        if ret.status_code != status_codes.HTTP_200_OK:
            print(f"BNetServer.post_transition_trigger request failed with status code {ret.status_code}.")
        return BNetServer.__litestar_response(ret)

    def post_add_token(self, token_data, timeout=REQ_DEFAULT_TIMEOUT_S) -> Response:
        url = self.addr() + HTTP_PATHS["token"]
        print("Posting tiken with data: ", token_data)
        ret = requests.post(url, json=token_data, timeout=timeout)
        if ret.status_code != status_codes.HTTP_200_OK:
            print(f"BNetServer.post_add_token request failed with status code {ret.status_code}.")
        return BNetServer.__litestar_response(ret)

    @staticmethod
    def __litestar_response(response) -> Response:
        return Response(
            status_code=response.status_code,
            content=response.content,
            cookies=response.cookies,
            encoding=response.encoding,
            headers=response.headers,
        )


def init_bnet_server(app: "Litestar") -> None:
    if not getattr(app.state, "bnet", None):
        app.state.bnet = BNetServer("localhost", 5050)  # TODO: from config / cli


async def shutdown_bnet_server(app: "Litestar") -> None:
    if getattr(app.state, "bnet", None):
        print("bnet: ", app.state.bnet.addr())


class BNetController(Controller):
    path = "/bnet"

    @post(path="/add_token")
    async def add_token(self, request: Request, state: "State") -> Response:
        response = Response(
            {"error": "could not retrive bnet from app state"}, status_code=status_codes.HTTP_500_INTERNAL_SERVER_ERROR
        )
        print("Adding tiken with data: ", await request.json())
        if getattr(state, "bnet", None):
            response = state.bnet.post_add_token(await request.json())
            if response.status_code is not status_codes.HTTP_200_OK:
                print(
                    "BNetController.add_token request failed with status code "
                    f"{response.status_code} and content: {response.content}."
                )
        return response

    @post(path="/trigger/{transition_id:str}")
    async def trigger_transition(self, transition_id: str, state: "State") -> Response[Dict]:
        response = Response(
            {"error": "could not retrive bnet from app state"}, status_code=status_codes.HTTP_500_INTERNAL_SERVER_ERROR
        )
        if getattr(state, "bnet", None):
            response = state.bnet.post_transition_trigger(transition_id)
            if response.status_code is not status_codes.HTTP_200_OK:
                print(
                    "BNetController.trigger_transition request failed with status code "
                    f"{response.status_code} and content: {response.content}."
                )
        return response

    @get("/{resource_path:str}")
    async def get_json(self, resource_path: str, state: "State") -> Response[Dict]:
        """
        Forward GET request to the BNet server
        """
        marking = {}
        status_code = status_codes.HTTP_500_INTERNAL_SERVER_ERROR
        if getattr(state, "bnet", None):
            [status_code, marking] = state.bnet.get_json(HTTP_PATHS[resource_path])
            if status_code is not status_codes.HTTP_200_OK:
                print(f"BNetController.get_json request failed with status code {status_code}.")
        else:
            print("BNetController.get_json Failed to get server from app state.")
        return Response(marking, status_code=status_code)


def register_bnet_server(app_config: "AppConfig") -> "AppConfig":
    app_config.route_handlers.append(BNetController)
    app_config.on_startup.append(init_bnet_server)
    app_config.on_shutdown.append(shutdown_bnet_server)
    return app_config
