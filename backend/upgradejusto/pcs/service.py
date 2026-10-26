"""CU03: validación de selección, sin inferir compatibilidad ni BIOS."""


class PCError(Exception):
    def __init__(self, status, detail):
        self.status, self.detail, self.retry = status, detail, None


class PCService:
    def __init__(self, repository, catalog):
        self.repository = repository
        self.catalog = catalog

    def get(self, owner, identity):
        pc = self.repository.get(owner, identity)
        if pc is None:
            raise PCError(404, "PC not found")
        return pc

    def list(self, owner, page, page_size):
        return self.repository.list(owner, page, page_size)

    def validate_components(self, groups):
        for group in groups:
            component = self.catalog.get_component(group.component_id)
            if component is None or component.category != group.category:
                raise PCError(422, "Invalid component selection")

    def create(self, owner, data):
        self.validate_components(data.components)
        return self.repository.create(owner, data)

    def update(self, owner, identity, data):
        self.get(owner, identity)
        self.validate_components(data.components)
        result, exists = self.repository.update(owner, identity, data)
        if result is None:
            raise PCError(
                409 if exists else 404,
                "PC revision conflict" if exists else "PC not found",
            )
        return result

    def delete(self, owner, identity):
        if not self.repository.delete(owner, identity):
            raise PCError(404, "PC not found")
