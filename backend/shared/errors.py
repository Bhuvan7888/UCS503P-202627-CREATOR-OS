class CreatorOSError(Exception):
    """Base exception for all domain errors."""

class InvalidStatusTransition(CreatorOSError):
    """Raised when an invalid state transition is attempted."""
    def __init__(self, entity: str, from_status: str, to_status: str):
        self.entity = entity
        self.from_status = from_status
        self.to_status = to_status
        super().__init__(f"Invalid transition for {entity} from '{from_status}' to '{to_status}'")

class NotFoundError(CreatorOSError):
    """Raised when an entity is not found."""

class PermissionDeniedError(CreatorOSError):
    """Raised when an actor acts on an entity they don't own."""

class ValidationError(CreatorOSError):
    """Raised when validation fails."""
