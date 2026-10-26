"""Application boundary reused by local importer and authenticated HTTP adapters."""

from upgradejusto.retail.repository import RetailRepository


class RetailService:
    def __init__(self, engine):
        self.repository = RetailRepository(engine)

    def publish(self, server_identity, batch, expected_active):
        return self.repository.publish(server_identity, batch, expected_active)
