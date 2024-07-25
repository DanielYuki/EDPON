class ArtCollection {
    constructor( artCollectionId, artCollectionAddress, collectionURI, creatorId, creatorName, collectionName, collectionCoverUrl, description, createdAt, price, isFree) {
        (this.artCollectionId = artCollectionId),
        (this.artCollectionAddress = artCollectionAddress),
        (this.collectionURI = collectionURI),
        (this.creatorId = creatorId),
        (this.creatorName = creatorName),
        (this.collectionName = collectionName),
        (this.collectionCoverUrl = collectionCoverUrl),
        (this.description = description),
        (this.createdAt = createdAt),
        (this.price = price);
        (this.isFree = isFree);
    }
}

export default ArtCollection;
