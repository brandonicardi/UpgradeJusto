"""Tower application service; declared models never become catalog matches."""

from upgradejusto.pcs.service import PCError


class TowerService:
    def __init__(self, repository, catalog):
        self.repository, self.catalog = repository, catalog

    def validate_lines(self, lines):
        for line in lines:
            if line.component_id is not None:
                component = self.catalog.get_component(line.component_id)
                if component is None or component.category != line.category:
                    raise PCError(422, "Invalid component selection")

    def get(self, owner, identity):
        tower = self.repository.get(owner, identity)
        if tower is None:
            raise PCError(404, "PC not found")
        return tower

    def list(self, owner, page, page_size):
        return self.repository.list(owner, page, page_size)

    def create(self, owner, data):
        self.validate_lines(data.lines)
        return self.repository.create(owner, data)

    def update(self, owner, identity, data):
        self.get(owner, identity)
        self.validate_lines(data.lines)
        return self.repository.update(owner, identity, data)

    def delete(self, owner, identity):
        if not self.repository.delete(owner, identity):
            raise PCError(404, "PC not found")
