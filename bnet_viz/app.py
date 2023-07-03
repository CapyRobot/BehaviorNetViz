from asyncio import sleep
from typing import Any

from pathlib import Path

from litestar import Litestar

from litestar.contrib.jinja import JinjaTemplateEngine
from litestar.template.config import TemplateConfig
from litestar.static_files.config import StaticFilesConfig
from litestar.config.cors import CORSConfig
from litestar.logging import LoggingConfig

from .bnet_connector import register_bnet_server

from litestar.datastructures import State

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from litestar.types import Scope

init_state = State({"key": "value"})


logging_config = LoggingConfig(
    loggers={
        "my_app": {
            "level": "INFO",
            "handlers": ["queue_listener"],
        }
    }
)

import logging

logger = logging.getLogger()


async def after_exception_handler(exc: Exception, scope: "Scope") -> None:
    """Hook function that will be invoked after each exception."""
    state = scope["app"].state
    if not hasattr(state, "error_count"):
        state.error_count = 1
    else:
        state.error_count += 1

    logger.info(
        "an exception of type %s has occurred for requested path %s and the application error count is %d.",
        type(exc).__name__,
        scope["path"],
        state.error_count,
    )


app = Litestar(
    on_app_init=[register_bnet_server],
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
    state=init_state,
    logging_config=logging_config,
    after_exception=[after_exception_handler],
)
