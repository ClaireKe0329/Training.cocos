export class GameUtility
{
    private static readonly _slotRowCount: number = 3;
    private static readonly _reelBufferUnitCount: number = 2;

    public static GetSlotRowCount(): number
    {
        return this._slotRowCount;
    }

    public static GetReelBufferUnitCount(): number
    {
        return this._reelBufferUnitCount;
    }

    public static GetReelSlotUnitCount(): number
    {
        return this._slotRowCount + this._reelBufferUnitCount;
    }
}
