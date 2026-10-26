"""Application service CU10; identity always supplied by authenticated adapter."""


class AdministrationService:
    def __init__(self, repository):
        self.repository = repository

    def list(self, owner, identity, collection, limit, offset):
        return self.repository.list(owner, identity, collection, limit, offset)

    def create(self, owner, data):
        return self.repository.create(owner, data.base_version)

    def write(self, owner, identity, collection, data=None, row_id=None, delete=False):
        return self.repository.write(owner, identity, collection, data, row_id, delete)

    def publish(self, owner, identity, data):
        return self.repository.publish(owner, identity, data.expected_active_version)
