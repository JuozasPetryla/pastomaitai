from pydantic import BaseModel


class Subsystem(BaseModel):
    id: str
    name: str
    description: str
    primary_actor: str
    use_cases: list[str]
