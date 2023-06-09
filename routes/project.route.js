const express = require("express");
const ProjectModel = require("../model/project.modal");

const app = express.Router();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get("/", async (req, res) => {
  try {
    const { page } = req.query;
    const pageNumber = parseInt(page) || 1;

    const limit = 5;
    const skip = (pageNumber - 1) * limit;

    const totalCount = await ProjectModel.countDocuments();

    // Retrieve the projects with pagination
    const projects = await ProjectModel.find().skip(skip).limit(limit);

    const totalPages = Math.ceil(totalCount / limit);

    res.status(200).json({
      page: pageNumber,
      perPage: limit,
      total: totalCount,
      totalPages: totalPages,
      data: projects,
    });
  } catch (err) {
    res.status(500).send(err);
  }
});

app.get("/sort/:sortBy", async (req, res) => {
  try {
    const sortBy = req.params.sortBy;
    const validFields = [
      "priority",
      "updatedAt",
      "startDate",
      "endDate",
      "status",
    ];
    if (!validFields.includes(sortBy)) {
      return res.status(400).send({ error: "Invalid sort field" });
    }
    const sortOption = { [sortBy]: 1 };

    const projects = await ProjectModel.find().sort(sortOption);
    res.status(200).send(projects);
  } catch (err) {
    res.status(500).send(err);
  }
});

app.get("/search/:query", async (req, res) => {
  try {
    const keywords = req.params.query;
    const query = {
      $or: [
        { title: { $regex: keywords, $options: "i" } },
        { location: { $regex: keywords, $options: "i" } },
        { category: { $regex: keywords, $options: "i" } },
        { status: { $regex: keywords, $options: "i" } },
        { department: { $regex: keywords, $options: "i" } },
        { divison: { $regex: keywords, $options: "i" } },
        { type: { $regex: keywords, $options: "i" } },
        { priority: { $regex: keywords, $options: "i" } },
        { reason: { $regex: keywords, $options: "i" } },
      ],
    };
    const projects = await ProjectModel.find(query);

    res.status(200).send(projects);
  } catch (err) {
    res.status(500).send({ error: "An error occurred" });
  }
});

app.post("/createnewproject", async (req, res) => {
  try {
    const project = await ProjectModel.create(req.body);
    res.status(201).send({
      success: true,
      message: "Project stored in database is  successfull",
      project: project,
    });
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
});

app.put("/changestatus/:id", async (req, res) => {
  const id = req.params.id;
  const status = req.body.status;
  try {
    await ProjectModel.findOneAndUpdate(
      { _id: id },
      { status: status, updatedAt: Date.now() }
    );
    res.status(200).send({
      success: true,
      message: "project updated successfully",
    });
  } catch (err) {
    res.status(500).send(err);
  }
});

app.get("/projectdata", async (req, res) => {
  try {
    const totalProjects = await ProjectModel.countDocuments();

    const runningProjects = await ProjectModel.countDocuments({ status: "running" });

    const closedProjects = await ProjectModel.countDocuments({ status: "closed" });

    const cancelledProjects = await ProjectModel.countDocuments({
      status: "cancelled",
    });

    const delayedProjects = await ProjectModel.countDocuments({
      status: "running",
      endDate: { $lt: new Date() },
    });

    res.status(200).send({
      totalProjects,
      runningProjects,
      closedProjects,
      cancelledProjects,
      delayedProjects,
    });
  } catch (err) {
    res.status(500).send(err);
  }
});

app.get("/departmentdata", async (req, res) => {
  try {
    // Retrieve the statistics of all departments
    const departmentStats = await ProjectModel.aggregate([
      {
        $group: {
          _id: "$department",
          totalProjects: { $sum: 1 },
          closedProjects: {
            $sum: {
              $cond: [{ $eq: ["$status", "closed"] }, 1, 0],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          department: "$_id",
          totalProjects: 1,
          closedProjects: 1,
          completionPercentage: {
            $cond: [
              { $eq: ["$totalProjects", 0] },
              0,
              {
                $round: [
                  {
                    $multiply: [
                      { $divide: ["$closedProjects", "$totalProjects"] },
                      100,
                    ],
                  },
                  0,
                ],
              },
            ],
          },
        },
      },
    ]);

    res.status(200).json(departmentStats);
  } catch (err) {
    res.status(500).send(err);
  }
});

module.exports = app;
