exports.getMyGroups = async (req, res) => {
  try {
    // Decoded from token
    const userId = req.user.id;
    const role = req.user.role;

    let groups = [];

    if (role === "Admin") {
      groups = await Group.find({
        adminId: userId,
      }).select("_id groupName adminId userId");
    } else {
      groups = await Group.find({
        userId: userId,
      }).select("_id groupName adminId userId");
    }

    return res.json({
      status: true,
      data: groups,
    });

  } catch (error) {
    return res.status(500).json({
      status: false,
      error: error.message,
    });
  }
};