"""Application service CU10; identity always supplied by authenticated adapter."""


class AdministrationService:
    def __init__(self, repository, pcs=None):
        self.repository = repository
        self.pcs = pcs

    def list(self, owner, identity, collection, limit, offset):
        return self.repository.list(owner, identity, collection, limit, offset)

    def dashboard(self, owner, limit, offset):
        usage = self.pcs.count_component_usage() if self.pcs is not None else {}
        return self.repository.dashboard(owner, usage, limit, offset)

    def create(self, owner, data):
        return self.repository.create(owner, data.base_version)

    def write(self, owner, identity, collection, data=None, row_id=None, delete=False):
        return self.repository.write(owner, identity, collection, data, row_id, delete)

    def publish(self, owner, identity, data):
        return self.repository.publish(owner, identity, data.expected_active_version)
