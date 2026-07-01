package com.burgerflow.backend.service;

import com.burgerflow.backend.entity.Product;
import com.burgerflow.backend.repository.ProductRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ProductService {

    private final ProductRepository repository;

    public ProductService(ProductRepository repository) {
        this.repository = repository;
    }

    public List<Product> listAll() {
        return repository.findAll();
    }

    public List<Product> listActive() {
        return repository.findByActiveTrue();
    }

    public Product getById(Long id) {
        return repository.findById(id).orElseThrow(() -> new IllegalArgumentException("Product not found: " + id));
    }

    public Product create(Product product) {
        product.setId(null);
        product.setActive(true);
        return repository.save(product);
    }

    public Product update(Long id, Product updatedProduct) {
        Product existing = getById(id);
        existing.setName(updatedProduct.getName());
        existing.setDescription(updatedProduct.getDescription());
        existing.setPrice(updatedProduct.getPrice());
        existing.setActive(updatedProduct.getActive());
        return repository.save(existing);
    }

    public void delete(Long id) {
        Product product = getById(id);
        repository.delete(product);
    }
}
