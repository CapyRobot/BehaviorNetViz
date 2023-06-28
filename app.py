"""Minimal Litestar application."""
from asyncio import sleep
from typing import Any

from pathlib import Path

from litestar import Litestar, get, MediaType
from litestar.response import Template
from litestar.contrib.jinja import JinjaTemplateEngine
from litestar.template.config import TemplateConfig
from litestar.static_files.config import StaticFilesConfig
from litestar.config.cors import CORSConfig


# @get("/")
# async def index() -> Template:
#     print("found route")
#     return Template(template_name="index.html")


# @get("/async")
# async def async_hello_world() -> dict[str, Any]:
#     """Route Handler that outputs hello world."""
#     await sleep(0.1)
#     return {"hello": "world"}


# @get("/sync", sync_to_thread=False)
# def sync_hello_world() -> dict[str, Any]:
#     """Route Handler that outputs hello world."""
#     return {"hello": "world"}

app = Litestar(
    route_handlers=[],
    template_config=TemplateConfig(
        directory=Path("static"),
        engine=JinjaTemplateEngine,
    ),
    static_files_config=[
        StaticFilesConfig(
            directories=["static"],
            path="/",
            html_mode=True,
            opt={"exclude_from_auth": True},
        )
    ],
    cors_config=CORSConfig(allow_origins=["*"]),
)
