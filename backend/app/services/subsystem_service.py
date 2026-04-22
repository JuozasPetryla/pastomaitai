from app.schemas.subsystem import Subsystem

SUBSYSTEMS: list[Subsystem] = [
    Subsystem(
        id="administration",
        name="Administration subsystem",
        description="Locker and courier administration.",
        primary_actor="Administrator",
        use_cases=[
            "Browse locker list",
            "Edit locker",
            "Delete locker",
            "Create locker",
            "Register courier",
        ],
    ),
    Subsystem(
        id="notifications",
        name="Notifications subsystem",
        description="Email and SMS notification management.",
        primary_actor="User",
        use_cases=[
            "Create messages",
            "Send email notification",
            "Review shipment status",
            "Send SMS notification",
        ],
    ),
    Subsystem(
        id="shipments",
        name="Shipments subsystem",
        description="Shipment registration and status management.",
        primary_actor="Sender / Receiver",
        use_cases=[],
    ),
    Subsystem(
        id="courier",
        name="Courier subsystem",
        description="Courier list and parcel handling workflow.",
        primary_actor="Courier",
        use_cases=[
            "Browse shipment list",
            "Service locker",
            "Pick up shipment",
            "Unload locker",
            "Load locker",
        ],
    ),
]


def list_subsystems() -> list[Subsystem]:
    return SUBSYSTEMS
