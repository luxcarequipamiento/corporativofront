export function catalogToPrices(catalog) {
  const products = catalog.productos || [];
  const formatPrice = (value, currency) => {
    if (value === null || value === undefined || value === '') return null;
    const amount = Number(value);
    if (!Number.isFinite(amount)) return String(value ?? '');
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: currency || 'PEN' }).format(amount);
  };
  const priceData = (value, currency) => {
    const amount = value === null || value === undefined || String(value).trim() === '' ? null : Number(value);
    const valid = amount !== null && Number.isFinite(amount) && amount >= 0;
    return { price: valid ? formatPrice(amount, currency) : null, unitPrice: valid ? Math.round(amount * 100) : null, currency: currency || 'PEN' };
  };
  const modelOf = (item) => item?.modelo || { id_modelo: 'unassigned', nombre_modelo: 'Sin modelo asignado' };
  const groupByModel = (entries) => {
    const groups = new Map();
    entries.forEach(({ model, item }) => {
      const key = String(model.id_modelo);
      if (!groups.has(key)) groups.set(key, { id: key, name: model.nombre_modelo, items: [] });
      groups.get(key).items.push(item);
    });
    return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  };
  const kitEntries = (catalog.kits || []).flatMap((kit) => {
    const componentsByModel = new Map();
    (kit.productos || []).forEach((product) => {
      const model = modelOf(product);
      const key = String(model.id_modelo);
      if (!componentsByModel.has(key)) componentsByModel.set(key, { model, products: [] });
      componentsByModel.get(key).products.push(product);
    });
    if (!componentsByModel.size) {
      const model = modelOf(kit);
      componentsByModel.set(String(model.id_modelo), { model, products: [] });
    }
    return [...componentsByModel.values()].map(({ model, products: kitProducts }) => ({
      model,
      item: {
        id: `${kit.id_kit || kit.id}-${model.id_modelo}`,
        name: kit.nombre,
        description: kit.descripcion,
        ...priceData(kit.precio_venta, kit.moneda),
        products: kitProducts.map((item) => ({
          id: item.id_producto || item.id,
          name: item.nombre,
          ...priceData(item.precio_venta, item.moneda),
          quantity: item.cantidad || 1
        }))
      }
    }));
  });
  return {
    kits: groupByModel(kitEntries),
    accessories: groupByModel(products.filter((item) => (item.tipo_producto || item.tipo)?.codigo === 'ACC').map((item) => ({
      model: modelOf(item),
      item: { id: item.id_producto || item.id, name: item.nombre, ...priceData(item.precio_venta, item.moneda) }
    }))),
    services: groupByModel([
      ...(catalog.servicios || []).map(service => ({
        model: modelOf(service),
        item: { id: `product-${service.id_producto || service.id}`, name: service.nombre, ...priceData(service.precio_venta, service.moneda), products: [] }
      })),
      ...(catalog.servicios_paquetes || []).flatMap((servicePackage) => {
      const productsByModel = new Map();
      (servicePackage.productos || []).forEach((product) => {
        const model = modelOf(product);
        const key = String(model.id_modelo);
        if (!productsByModel.has(key)) productsByModel.set(key, { model, products: [] });
        productsByModel.get(key).products.push(product);
      });
      if (!productsByModel.size) {
        const model = modelOf(servicePackage);
        productsByModel.set(String(model.id_modelo), { model, products: [] });
      }
      return [...productsByModel.values()].map(({ model, products: packageProducts }) => ({
        model,
        item: {
          id: `${servicePackage.id_servicio_paquete || servicePackage.id}-${model.id_modelo}`,
          name: servicePackage.nombre,
          description: servicePackage.descripcion,
          ...priceData(servicePackage.precio_venta, servicePackage.moneda),
          products: packageProducts.map((item) => ({
            id: item.id_producto || item.id,
            name: item.nombre,
            ...priceData(item.precio_venta, item.moneda),
            quantity: item.cantidad || 1
          }))
        }
      }));
    })])
  };
}
