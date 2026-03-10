var express = require("express");
var router = express.Router();
var CategoryService = require(global.__basedir + "/apps/Services/CategoryService");
var Category = require(global.__basedir + "/apps/Entity/Category");

router.get("/", function(req, res) {
    res.render("admin/categorymanage", { page: 'categories' });
});

router.get("/list", async function(req, res) {
    try {
        var service = new CategoryService();
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        
        var result = await service.getCategories(page, limit);
        res.json(result);
    } catch (e) {
        console.log(e);
        res.status(500).json({ status: false, message: "Internal Server Error" });
    }
});

router.post("/create", async function(req, res) {
    try {
        var service = new CategoryService();
        var category = new Category();
        category.Name = req.body.Name;
        
        await service.insertCategory(category);
        res.json({ status: true, message: "Category created successfully" });
    } catch (e) {
        console.log(e);
        res.status(500).json({ status: false, message: "Error creating category" });
    }
});

router.post("/update", async function(req, res) {
    try {
        var service = new CategoryService();
        var category = new Category();
        category._id = req.body.Id;
        category.Name = req.body.Name;
        
        await service.updateCategory(category);
        res.json({ status: true, message: "Category updated successfully" });
    } catch (e) {
        console.log(e);
        res.status(500).json({ status: false, message: "Error updating category" });
    }
});

router.delete("/delete", async function(req, res) {
    try {
        var service = new CategoryService();
        await service.deleteCategory(req.query.id);
        res.json({ status: true, message: "Category deleted successfully" });
    } catch (e) {
        console.log(e);
        res.status(500).json({ status: false, message: "Error deleting category" });
    }
});

module.exports = router;
