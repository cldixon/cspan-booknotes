class FieldNotFoundError(Exception):
    """Base exception for when any field is not found during parsing"""

    pass


# Field-specific exceptions
class ProgramIdNotFoundError(FieldNotFoundError):
    """Raised when program ID cannot be found or extracted"""

    pass


class DescriptionNotFoundError(FieldNotFoundError):
    """Raised when program description cannot be found or extracted"""

    pass


class GuestAuthorNotFoundError(FieldNotFoundError):
    """Raised when author name cannot be found or extracted"""

    pass


class BookISBNNotFoundError(FieldNotFoundError):
    """Raised when book ISBN cannot be found or extracted"""

    pass


class DurationNotFoundError(FieldNotFoundError):
    """Raised when episode duration cannot be found or extracted"""

    pass


class AirDateNotFoundError(FieldNotFoundError):
    """Raised when air date cannot be found or extracted"""

    pass


class TranscriptNotFoundError(FieldNotFoundError):
    """Raised when transcript cannot be found or extracted"""

    pass


class TitleNotFoundError(FieldNotFoundError):
    """Raised when episode title cannot be found or extracted"""

    pass


class RelatedProgramsNotFoundError(FieldNotFoundError):
    """Raised when related programs cannot be found or extracted"""

    pass
