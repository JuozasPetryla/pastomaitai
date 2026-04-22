from app.schemas.subsystem import Subsystem

SUBSYSTEMS: list[Subsystem] = [
    Subsystem(
        id="administration",
        name="Administracijos posistemis",
        description="Paštomatų ir kurjerių administravimas.",
        primary_actor="Administratorius",
        use_cases=[
            "Peržiūrėti paštomatų sąrašą",
            "Redaguoti paštomatą",
            "Naikinti paštomatą",
            "Kurti paštomatą",
            "Registruoti kurjerį",
        ],
    ),
    Subsystem(
        id="notifications",
        name="Pranešimų posistemis",
        description="Žinučių, laiškų ir SMS pranešimų siuntimas.",
        primary_actor="Naudotojas",
        use_cases=[
            "Suformuoti žinutes",
            "Siųsti el. laišką",
            "Peržiūrėti siuntos statusą",
            "Siųsti SMS pranešimą",
        ],
    ),
    Subsystem(
        id="shipments",
        name="Siuntų posistemis",
        description="Siuntų registravimas, siuntimas, atsiėmimas ir apmokėjimas.",
        primary_actor="Siuntėjas / Gavėjas",
        use_cases=[],
    ),
    Subsystem(
        id="courier",
        name="Kurjerio posistemis",
        description="Kurjerio siuntų sąrašas ir paštomato pakrovimas.",
        primary_actor="Kurjeris",
        use_cases=[
            "Žiūrėti siuntų sąrašą",
            "Aptarnauti paštomatą",
            "Eiti į siuntą iki paštomato",
            "Iškrauti paštomatą",
            "Pakrauti paštomatą",
        ],
    ),
]


def list_subsystems() -> list[Subsystem]:
    return SUBSYSTEMS
